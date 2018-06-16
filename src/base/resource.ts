import { IStringMap } from '../lib/types';
import Node from './node';
import NodeList from './nodelist';
import { INLINE_CHROME } from '../lib/constants';
import { cameltoLowerCase, convertPX, generateId, hasValue, isNumber } from '../lib/util';
import { convertRGBtoHex, findNearestColor, parseRGBA } from '../lib/color';
import { getBoxSpacing, getStyle } from '../lib/dom';
import SETTINGS from '../settings';

export default class Resource<T extends Node> {
    public static STORED = {
        STRINGS: new Map(),
        COLORS: new Map(),
        IMAGES: new Map()
    };

    public static addString(value: string, name = '') {
        if (hasValue(value)) {
            if (name === '') {
                name = value;
            }
            const num = isNumber(value);
            if (SETTINGS.numberResourceValue || !num) {
                for (const [storedValue, storedName] of Resource.STORED.STRINGS.entries()) {
                    if (storedValue === value) {
                        return (<string> storedValue);
                    }
                }
                name = name.trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().replace(/_+/g, '_').split('_').slice(0, 5).join('_').replace(/_+$/g, '');
                if (num || /^[0-9].*/.test(value)) {
                    name = `__${name}`;
                }
                else if (name === '') {
                    name = `__symbol${Math.ceil(Math.random() * 100000)}`;
                }
                Resource.STORED.STRINGS.set(value, name);
            }
            return value;
        }
        return '';
    }

    public static addImage(images: IStringMap) {
        let src = '';
        if (images['mdpi'] != null && hasValue(images['mdpi'])) {
            const image = images['mdpi'].substring(images['mdpi'].lastIndexOf('/') + 1);
            const format = image.substring(image.lastIndexOf('.') + 1).toLowerCase();
            src = image.replace(/.\w+$/, '');
            switch (format) {
                case 'bmp':
                case 'bmpf':
                case 'cur':
                case 'gif':
                case 'ico':
                case 'jpg':
                case 'png':
                case 'tif':
                case 'tiff':
                case 'webp':
                case 'xbm':
                    src = Resource.insertStoredAsset('IMAGES', src, images);
                    break;
                default:
                    src = '';
            }
        }
        return src;
    }

    public static addColor(value: string, hex = true) {
        value = value.toUpperCase().trim();
        if (value !== '') {
            let colorName = '';
            if (!Resource.STORED.COLORS.has(value)) {
                const color = findNearestColor(value);
                if (color !== '') {
                    color.name = cameltoLowerCase((<string> color.name));
                    if (value === color.hex) {
                        colorName = color.name;
                    }
                    else {
                        colorName = generateId('color', `${color.name}_1`);
                    }
                    Resource.STORED.COLORS.set(value, colorName);
                }
            }
            else {
                colorName = Resource.STORED.COLORS.get(value);
            }
            return (hex ? [colorName, value] : colorName);
        }
        return '';
    }

    public static insertStoredAsset(asset: string, name: string, value: any) {
        const stored = Resource.STORED[asset];
        if (stored != null) {
            let storedName = '';
            if (isNumber(name)) {
                name = `__${name}`;
            }
            if (hasValue(value)) {
                let i = 0;
                do {
                    storedName = name;
                    if (i > 0) {
                        storedName += i;
                    }
                    if (!stored.has(storedName)) {
                        stored.set(storedName, value);
                    }
                    i++;
                }
                while (stored.has(storedName) && stored.get(storedName) !== value);
            }
            return storedName;
        }
        return '';
    }

    public cache: NodeList<T>;

    constructor()
    {
    }

    public setBoxSpacing() {
        this.cache.elements.forEach((node: T) => {
            if (node.element instanceof HTMLElement) {
                const element = (<HTMLElement> node.element);
                const result = getBoxSpacing(element);
                for (const i in result) {
                    result[i] += 'px';
                }
                (<any> element).__boxSpacing = result;
            }
        });
    }

    public setBoxStyle() {
        this.cache.elements.forEach((node: T) => {
            if (node.element instanceof HTMLElement) {
                const element = (<HTMLElement> node.element);
                const result: any = {
                    border: this.parseBorderStyle,
                    borderTop: this.parseBorderStyle,
                    borderRight: this.parseBorderStyle,
                    borderBottom: this.parseBorderStyle,
                    borderLeft: this.parseBorderStyle,
                    borderRadius: this.parseBoxDimensions,
                    backgroundColor: parseRGBA,
                    backgroundImage: this.parseImageURL,
                    backgroundSize: this.parseBoxDimensions
                };
                let backgroundParent: string[] = [];
                if (element.parentElement != null) {
                    backgroundParent = parseRGBA(getStyle(element.parentElement).backgroundColor) || [];
                }
                for (const i in result) {
                    result[i] = result[i](node.css(i));
                }
                result.border[2] = Resource.addColor(result.border[2], false);
                if (backgroundParent[0] === result.backgroundColor[0] || result.backgroundColor[4] === 0 || (SETTINGS.excludeBackgroundColor && SETTINGS.excludeBackgroundColor.includes(convertRGBtoHex(result.backgroundColor[0])))) {
                    result.backgroundColor = '';
                }
                else {
                    result.backgroundColor = (!SETTINGS.excludeBackgroundColor.includes(result.backgroundColor[1]) ? Resource.addColor(result.backgroundColor[1]) : '');
                }
                (<any> element).__boxStyle = result;
            }
        });
    }

    public setFontStyle() {
        this.cache.elements.forEach((node: T) => {
            if ((node.visible || node.companion) && node.renderChildren.length === 0) {
                const element = (<HTMLElement> node.element);
                switch (element.tagName) {
                    case 'IMG':
                    case 'HR':
                    case 'AREA':
                        return;
                }
                const color = parseRGBA(node.css('color') || '');
                const backgroundColor = parseRGBA(node.css('backgroundColor') || '');
                const result = {
                    fontFamily: node.css('fontFamily'),
                    fontStyle: node.css('fontStyle'),
                    fontSize: node.css('fontSize'),
                    fontWeight: node.css('fontWeight'),
                    color: (color !== '' ? Resource.addColor(color[1]) : ''),
                    backgroundColor: (backgroundColor !== '' ? Resource.addColor(backgroundColor[1]) : '')
                };
                (<any> element).__fontStyle = result;
            }
        });
    }

    public setImageSource() {
        this.cache.filter((item: T) => item.tagName === 'IMG').forEach((node: T) => {
            const element = (<HTMLImageElement> node.element);
            const srcset = element.srcset.trim();
            const images: IStringMap = {};
            if (hasValue(srcset)) {
                const filepath = element.src.substring(0, element.src.lastIndexOf('/') + 1);
                srcset.split(',').forEach((value: string) => {
                    const match = /^(.*?)\s*([0-9]+\.?[0-9]*x)?$/.exec(value.trim());
                    if (match != null) {
                        if (match[2] == null) {
                            match[2] = '1x';
                        }
                        const image = filepath + match[1].substring(match[1].lastIndexOf('/') + 1);
                        switch (match[2]) {
                            case '0.75x':
                                images['ldpi'] = image;
                                break;
                            case '1x':
                                images['mdpi'] = image;
                                break;
                            case '1.5x':
                                images['hdpi'] = image;
                                break;
                            case '2x':
                                images['xhdpi'] = image;
                                break;
                            case '3x':
                                images['xxhdpi'] = image;
                                break;
                            case '4x':
                                images['xxxhdpi'] = image;
                                break;
                        }
                    }
                });
            }
            if (images['mdpi'] == null) {
                images['mdpi'] = element.src;
            }
            const result = Resource.addImage(images);
            (<any> element).__imageSource = result;
        });
    }

    public setOptionArray() {
        this.cache.filter((item: T) => item.tagName === 'SELECT').forEach((node: T) => {
            const element = (<HTMLSelectElement> node.element);
            const stringArray: string[] = [];
            let numberArray: string[] | null = [];
            for (let i = 0; i < element.children.length; i++) {
                const item = (<HTMLOptionElement> element.children[i]);
                const value = item.text.trim();
                if (value !== '') {
                    if (numberArray != null && stringArray.length === 0 && isNumber(value)) {
                        numberArray.push(value);
                    }
                    else {
                        if (numberArray != null && numberArray.length > 0) {
                            i = -1;
                            numberArray = null;
                            continue;
                        }
                        const result = Resource.addString(value);
                        if (result != null) {
                            stringArray.push(result);
                        }
                    }
                }
            }
            (<any> element).__optionArray = { stringArray: (stringArray.length > 0 ? stringArray : null), numberArray: (numberArray != null && numberArray.length > 0 ? numberArray : null) };
        });
    }

    public setValueString() {
        this.cache.elements.forEach((node: T) => {
            const element = (<HTMLElement> node.element);
            let name = '';
            let value = '';
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                value = (<HTMLInputElement> element).value.trim();
            }
            else if (element.nodeName === '#text') {
                value = (element.textContent ? element.textContent.trim() : '');
            }
            else if (element.children.length === 0 || Array.from(element.children).every((item: HTMLElement) => INLINE_CHROME.includes(item.tagName))) {
                name = element.innerText.trim();
                value = element.innerHTML.trim();
            }
            if (hasValue(value)) {
                Resource.addString(value, name);
                (<any> element).__valueString = value;
            }
        });
    }

    private parseBorderStyle(value: string): string[] {
        const stroke = value.match(/(none|dotted|dashed|solid)/);
        const width = value.match(/([0-9.]+(?:px|pt|em))/);
        const color = parseRGBA(value);
        return [(stroke != null ? stroke[1] : 'solid'), (width != null ? convertPX(width[1]) : '1px'), (color != null ? color[1] : '#000')];
    }

    private parseBoxDimensions(value: string): string[] {
        const match = value.match(/^([0-9]+(?:px|pt|em))( [0-9]+(?:px|pt|em))?( [0-9]+(?:px|pt|em))?( [0-9]+(?:px|pt|em))?$/);
        if (match != null) {
            if (match[1] === '0px' && match[2] == null) {
                return [];
            }
            if (match[2] == null || (match[1] === match[2] && match[2] === match[3] && match[3] === match[4])) {
                return [convertPX(match[1])];
            }
            else if (match[3] == null || (match[1] === match[3] && match[2] === match[4])) {
                return [convertPX(match[1]), convertPX(match[2])];
            }
            else {
                return [convertPX(match[1]), convertPX(match[2]), convertPX(match[3]), convertPX(match[4])];
            }
        }
        return [];
    }

    private parseImageURL(value: string) {
        const match = value.match(/^url\("(.*?)"\)$/);
        if (match != null) {
            return Resource.addImage({ 'mdpi': match[1] });
        }
        return '';
    }
}