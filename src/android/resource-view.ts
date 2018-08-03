import { ArrayIndex, BasicData, BorderAttribute, BoxStyle, FontAttribute, Null, ObjectMap, StringMap, ViewData } from '../lib/types';
import Resource from '../base/resource';
import File from '../base/file';
import View from './view';
import { cameltoLowerCase, capitalize, convertWord, formatPX, formatString, hasValue, includesEnum, isNumber, lastIndexOf, resolvePath, trim } from '../lib/util';
import { generateId, replaceDP } from './lib/util';
import { getTemplateLevel, insertTemplateData, parseTemplate } from '../lib/xml';
import { sameAsParent } from '../lib/dom';
import { findNearestColor, parseHex } from '../lib/color';
import { NODE_RESOURCE, NODE_STANDARD } from '../lib/constants';
import { FONT_ANDROID, FONTALIAS_ANDROID, FONTREPLACE_ANDROID, FONTWEIGHT_ANDROID, RESERVED_JAVA } from './constants';
import parseRTL from './localization';
import SETTINGS from '../settings';

import SHAPERECTANGLE_TMPL from './template/resource/shape-rectangle';
import LAYERLIST_TMPL from './template/resource/layer-list';

const METHOD_ANDROID = {
    'boxSpacing': {
        'margin': 'android:layout_margin="{0}"',
        'marginTop': 'android:layout_marginTop="{0}"',
        'marginRight': 'android:layout_marginRight="{0}"',
        'marginBottom': 'android:layout_marginBottom="{0}"',
        'marginLeft': 'android:layout_marginLeft="{0}"',
        'padding': 'android:padding="{0}"',
        'paddingTop': 'android:paddingTop="{0}"',
        'paddingRight': 'android:paddingRight="{0}"',
        'paddingBottom': 'android:paddingBottom="{0}"',
        'paddingLeft': 'android:paddingLeft="{0}"'
    },
    'boxStyle': {
        'background': 'android:background="@drawable/{0}"',
        'backgroundColor': 'android:background="@color/{0}"'
    },
    'fontStyle': {
        'fontFamily': 'android:fontFamily="{0}"',
        'fontStyle': 'android:textStyle="{0}"',
        'fontWeight': 'android:fontWeight="{0}"',
        'fontSize': 'android:textSize="{0}"',
        'color': 'android:textColor="{0}"',
        'backgroundColor': 'android:background="{0}"'
    },
    'valueString': {
        'text': 'android:text="{0}"'
    },
    'optionArray': {
        'entries': 'android:entries="@array/{0}"'
    },
    'imageSource': {
        'src': 'android:src="@drawable/{0}"'
    }
};

interface StyleTag {
    name?: string;
    attributes: string;
    ids: number[];
}

type StyleList = ArrayIndex<ObjectMap<number[]>>;

export default class ResourceView<T extends View> extends Resource<T> {
    public static addString(value: string, name = '') {
        if (value != null && value !== '') {
            if (name === '') {
                name = value;
            }
            const numeric = isNumber(value);
            if (SETTINGS.numberResourceValue || !numeric) {
                for (const [resourceName, resourceValue] of Resource.STORED.STRINGS.entries()) {
                    if (resourceValue === value) {
                        return resourceName;
                    }
                }
                name = name.trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().replace(/_+/g, '_').split('_').slice(0, 4).join('_').replace(/_+$/g, '');
                if (numeric || /^[0-9]/.test(value) || RESERVED_JAVA.includes(name)) {
                    name = `__${name}`;
                }
                else if (name === '') {
                    name = `__symbol${Math.ceil(Math.random() * 100000)}`;
                }
                if (Resource.STORED.STRINGS.has(name)) {
                    name = generateId('strings', `${name}_1`);
                }
                Resource.STORED.STRINGS.set(name, value);
            }
            return name;
        }
        return '';
    }

    public static addImageSrcSet(element: HTMLImageElement, prefix = '') {
        const srcset = element.srcset.trim();
        const images = {};
        if (hasValue(srcset)) {
            const filePath = element.src.substring(0, element.src.lastIndexOf('/') + 1);
            srcset.split(',').forEach(value => {
                const match = /^(.*?)\s*([0-9]+\.?[0-9]*x)?$/.exec(value.trim());
                if (match != null) {
                    if (match[2] == null) {
                        match[2] = '1x';
                    }
                    const image = filePath + lastIndexOf(match[1]);
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
        return ResourceView.addImage(images, prefix);
    }

    public static addImage(images: StringMap, prefix = '') {
        let src = '';
        if (images && hasValue(images['mdpi'])) {
            src = lastIndexOf(images['mdpi']);
            const format = lastIndexOf(src, '.').toLowerCase();
            src = src.replace(/.\w+$/, '').replace(/-/g, '_');
            switch (format) {
                case 'bmp':
                case 'cur':
                case 'gif':
                case 'ico':
                case 'jpg':
                case 'png':
                    src = Resource.insertStoredAsset('IMAGES', prefix + src, images);
                    break;
                default:
                    src = '';
            }
        }
        return src;
    }

    public static addImageURL(value: string, prefix: string = '') {
        const match = value.match(/^url\("?(.*?)"?\)$/);
        if (match != null) {
            return ResourceView.addImage({ 'mdpi': resolvePath(match[1]) }, prefix);
        }
        return '';
    }

    public static addColor(value: string, opacity = '1') {
        value = value.toUpperCase().trim();
        const opaque = (parseFloat(opacity) < 1 ? `#${opacity.substring(2) + value.substring(1)}` : value);
        if (value !== '') {
            let colorName = '';
            if (!Resource.STORED.COLORS.has(opaque)) {
                const color = findNearestColor(value);
                if (color !== '') {
                    color.name = cameltoLowerCase(<string> color.name);
                    if (value === color.hex && value === opaque) {
                        colorName = color.name;
                    }
                    else {
                        colorName = generateId('color', `${color.name}_1`);
                    }
                    Resource.STORED.COLORS.set(opaque, colorName);
                }
            }
            else {
                colorName = (<string> Resource.STORED.COLORS.get(opaque));
            }
            return colorName;
        }
        return '';
    }

    private tagStyle: ObjectMap<StyleList> = {};
    private tagCount: ObjectMap<number> = {};

    constructor(file: File<T>) {
        super(file);
        this.file.stored = Resource.STORED;
    }

    public reset() {
        super.reset();
        this.file.reset();
        this.tagStyle = {};
        this.tagCount = {};
    }

    public finalize(viewData: ViewData<T>) {
        this.processFontStyle(viewData);
    }

    public filterStyles(viewData: ViewData<T>) {
        const styles: ObjectMap<string[]> = {};
        viewData.cache.forEach(node => {
            const children = node.renderChildren.filter(child => child.visible && !child.isolated && !child.relocated);
            if (children.length > 1) {
                const map = {};
                let style = '';
                let valid = true;
                children.forEach((child, index) => {
                    let found = false;
                    child.combine('_', 'android').forEach(value => {
                        if (value.startsWith('style=')) {
                            if (index === 0) {
                                style = value;
                            }
                            else {
                                if (value !== style) {
                                    valid = false;
                                }
                            }
                            found = true;
                        }
                        if (map[value] == null) {
                            map[value] = 0;
                        }
                        map[value]++;
                    });
                    if (style !== '' && !found) {
                        valid = false;
                    }
                });
                if (valid) {
                    for (const attr in map) {
                        if (map[attr] !== children.length) {
                            delete map[attr];
                        }
                    }
                    if (Object.keys(map).length > 1) {
                        if (style !== '') {
                            style = trim(style.substring(style.indexOf('/') + 1), '"');
                        }
                        const common: string[] = [];
                        for (const attr in map) {
                            const match = attr.match(/(\w+):(\w+)="(.*?)"/);
                            if (match != null) {
                                children.forEach(child => child.delete(match[1], match[2]));
                                common.push(match[0]);
                            }
                        }
                        common.sort();
                        let name = '';
                        for (const index in styles) {
                            if (styles[index].join(';') === common.join(';')) {
                                name = index;
                                break;
                            }
                        }
                        if (!(name !== '' && style !== '' && name.startsWith(`${style}.`))) {
                            name = (style !== '' ? `${style}.` : '') + node.nodeId;
                            styles[name] = common;
                        }
                        children.forEach(child => child.add('_', 'style', `@style/${name}`));
                    }
                }
            }
        });
        if (Object.keys(styles).length > 0) {
            for (const name in styles) {
                Resource.STORED.STYLES.set(name, { attributes: styles[name].join(';') });
            }
        }
    }

    public setBoxSpacing() {
        super.setBoxSpacing();
        this.cache.elements.forEach(node => {
            if (!includesEnum(node.excludeResource, NODE_RESOURCE.BOX_SPACING)) {
                const stored: StringMap = (<any> node.element).__boxSpacing;
                if (stored != null) {
                    const method = METHOD_ANDROID['boxSpacing'];
                    for (const attr in stored) {
                        if (stored[attr] !== '0px') {
                            node.attr(formatString(parseRTL(method[attr]), node.styleMap[attr] || stored[attr]), (node.renderExtension == null));
                        }
                    }
                }
            }
        });
    }

    public setBoxStyle() {
        super.setBoxStyle();
        this.cache.elements.forEach(node => {
            if (!includesEnum(node.excludeResource, NODE_RESOURCE.BOX_STYLE)) {
                const element = node.element;
                const object: any = element;
                const stored: BoxStyle = object.__boxStyle;
                if (stored != null) {
                    if (stored.backgroundColor && stored.backgroundColor.length > 0) {
                        stored.backgroundColor = ResourceView.addColor(stored.backgroundColor[0], stored.backgroundColor[2]);
                    }
                    stored.backgroundImage = ResourceView.addImageURL(stored.backgroundImage);
                    [stored.borderTop, stored.borderRight, stored.borderBottom, stored.borderLeft].forEach((item: BorderAttribute) => {
                        if (item.color && item.color.length > 0) {
                            item.color = (<string> ResourceView.addColor(item.color[0], item.color[2]));
                        }
                    });
                    const method = METHOD_ANDROID['boxStyle'];
                    const companion = node.companion;
                    if (companion && !sameAsParent(companion.element, 'backgroundColor')) {
                         const boxStyle: BoxStyle = (<any> companion.element).__boxStyle;
                         if (boxStyle && Array.isArray(boxStyle.backgroundColor)) {
                            stored.backgroundColor = ResourceView.addColor(boxStyle.backgroundColor[0], boxStyle.backgroundColor[2]);
                         }
                    }
                    if (this.borderVisible(stored.borderTop) || this.borderVisible(stored.borderRight) || this.borderVisible(stored.borderBottom) || this.borderVisible(stored.borderLeft) || stored.backgroundImage !== '' || stored.borderRadius.length > 0) {
                        let template: Null<ObjectMap<string>> = null;
                        let data;
                        let resourceName = '';
                        let gravity = '';
                        let tileMode = '';
                        let tileModeX = '';
                        let tileModeY = '';
                        switch (stored.backgroundPosition) {
                            case 'left center':
                            case '0% 50%':
                                gravity = 'left|center_vertical';
                                break;
                            case 'left bottom':
                            case '0% 100%':
                                gravity = 'left|bottom';
                                break;
                            case 'right top':
                            case '100% 0%':
                                gravity = 'right|top';
                                break;
                            case 'right center':
                            case '100% 50%':
                                gravity = 'right|center_vertical';
                                break;
                            case 'right bottom':
                            case '100% 100%':
                                gravity = 'right|bottom';
                                break;
                            case 'center top':
                            case '50% 0%':
                                gravity = 'center_horizontal|top';
                                break;
                            case 'center bottom':
                            case '50% 100%':
                                gravity = 'center_horizontal|bottom';
                                break;
                            case 'center center':
                            case '50% 50%':
                                gravity = 'center';
                                break;
                        }
                        switch (stored.backgroundRepeat) {
                            case 'repeat-x':
                                tileModeX = 'repeat';
                                break;
                            case 'repeat-y':
                                tileModeY = 'repeat';
                                break;
                            case 'no-repeat':
                                tileMode = 'disabled';
                                break;
                        }
                        const image6: ArrayIndex<StringMap> = [];
                        const image7: ArrayIndex<StringMap> = [];
                        if (stored.backgroundImage !== '') {
                            if (gravity !== '' || tileMode !== '' || tileModeX !== '' || tileModeY !== '') {
                                image7[0] = { image: stored.backgroundImage, gravity, tileMode, tileModeX, tileModeY };
                            }
                            else {
                                image6[0] = { image: stored.backgroundImage, width: (stored.backgroundSize.length > 0 ? stored.backgroundSize[0] : ''), height: (stored.backgroundSize.length > 0 ? stored.backgroundSize[1] : '') };
                            }
                        }
                        const backgroundColor = this.getShapeAttribute(stored, 'backgroundColor');
                        const radius = this.getShapeAttribute(stored, 'radius');
                        const radiusInit = this.getShapeAttribute(stored, 'radiusInit');
                        if (stored.border != null) {
                            if (stored.backgroundImage === '') {
                                template = parseTemplate(SHAPERECTANGLE_TMPL);
                                data = {
                                    '0': [{
                                        '1': this.getShapeAttribute(stored, 'stroke'),
                                        '2': (stored.backgroundColor.length > 0 || stored.borderRadius.length > 0 ? [{
                                            '3': backgroundColor,
                                            '4': radius,
                                            '5': radiusInit
                                        }] : false)
                                    }]
                                };
                                if (stored.borderRadius.length > 1) {
                                    const shape = getTemplateLevel(data, '0', '2');
                                    const borderRadius = this.getShapeAttribute(stored, 'radiusAll');
                                    shape['5'].push(borderRadius);
                                }
                            }
                            else if (stored.backgroundImage !== '' && (stored.border.style === 'none' || stored.border.width === '0px')) {
                                template = parseTemplate(LAYERLIST_TMPL);
                                data = {
                                    '0': [{
                                        '1': [{
                                            '2': false,
                                            '3': backgroundColor,
                                            '4': false,
                                            '5': false
                                        }],
                                        '6': (image6.length > 0 ? image6 : false),
                                        '7': (image7.length > 0 ? image7 : false)
                                    }]
                                };
                            }
                            else {
                                template = parseTemplate(LAYERLIST_TMPL);
                                data = {
                                    '0': [{
                                        '1': [{
                                            '2': this.getShapeAttribute(stored, 'stroke'),
                                            '3': backgroundColor,
                                            '4': radius,
                                            '5': radiusInit
                                        }],
                                        '6': (image6.length > 0 ? image6 : false),
                                        '7': (image7.length > 0 ? image7 : false)
                                    }]
                                };
                                if (stored.borderRadius.length > 1) {
                                    const shape = getTemplateLevel(data, '0', '1');
                                    const borderRadius = this.getShapeAttribute(stored, 'radiusAll');
                                    shape['5'].push(borderRadius);
                                }
                            }
                        }
                        else {
                            template = parseTemplate(LAYERLIST_TMPL);
                            data = {
                                '0': [{
                                    '1': [],
                                    '6': (image6.length > 0 ? image6 : false),
                                    '7': (image7.length > 0 ? image7 : false)
                                }]
                            };
                            const root = getTemplateLevel(data, '0');
                            const borders: BorderAttribute[] = [stored.borderTop, stored.borderRight, stored.borderBottom, stored.borderLeft];
                            let valid = true;
                            let width = '';
                            let borderStyle = '';
                            let radiusSize = '';
                            borders.some((item, index) => {
                                if (this.borderVisible(item)) {
                                    if ((width !== '' && width !== item.width) || (borderStyle !== '' && borderStyle !== this.getBorderStyle(item)) || (radiusSize !== '' && radiusSize !== stored.borderRadius[index])) {
                                        valid = false;
                                        return true;
                                    }
                                    [width, borderStyle, radiusSize] = [item.width, this.getBorderStyle(item), stored.borderRadius[index]];
                                }
                                return false;
                            });
                            const borderRadius = {};
                            if (stored.borderRadius.length > 1) {
                                Object.assign(borderRadius, {
                                    topLeftRadius: stored.borderRadius[0],
                                    topRightRadius: stored.borderRadius[1],
                                    bottomRightRadius: stored.borderRadius[2],
                                    bottomLeftRadius: stored.borderRadius[3]
                                });
                            }
                            root['1'].push({ '2': false, '3': backgroundColor, '4': false, '5': false });
                            if (valid) {
                                const hideWidth = `-${formatPX(parseInt(width) * 2)}`;
                                const layerList: {} = {
                                    'top': (this.borderVisible(stored.borderTop) ? '' : hideWidth),
                                    'right': (this.borderVisible(stored.borderRight) ? '' : hideWidth),
                                    'bottom': (this.borderVisible(stored.borderBottom) ? '' : hideWidth),
                                    'left': (this.borderVisible(stored.borderLeft) ? '' : hideWidth),
                                    '2': [{ width, borderStyle }],
                                    '3': false,
                                    '4': radius,
                                    '5': radiusInit
                                };
                                if (stored.borderRadius.length > 1) {
                                    layerList['5'].push(borderRadius);
                                }
                                root['1'].push(layerList);
                            }
                            else {
                                borders.forEach((item, index) => {
                                    if (this.borderVisible(item)) {
                                        const hideWidth = `-${item.width}`;
                                        const layerList: {} = {
                                            'top': hideWidth,
                                            'right': hideWidth,
                                            'bottom': hideWidth,
                                            'left': hideWidth,
                                            '2': [{ width: item.width, borderStyle: this.getBorderStyle(item) }],
                                            '3': false,
                                            '4': radius,
                                            '5': radiusInit
                                        };
                                        layerList[['top', 'right', 'bottom', 'left'][index]] = '';
                                        if (stored.borderRadius.length > 1) {
                                            layerList['5'].push(borderRadius);
                                        }
                                        root['1'].push(layerList);
                                    }
                                });
                            }
                            if (root['1'].length === 0) {
                                root['1'] = false;
                            }
                        }
                        if (template != null) {
                            const xml = insertTemplateData(template, data);
                            for (const [name, value] of Resource.STORED.DRAWABLES.entries()) {
                                if (value === xml) {
                                    resourceName = name;
                                    break;
                                }
                            }
                            if (resourceName === '') {
                                resourceName = `${node.tagName.toLowerCase()}_${node.nodeId}`;
                                Resource.STORED.DRAWABLES.set(resourceName, xml);
                            }
                        }
                        node.attr(formatString(method['background'], resourceName), (node.renderExtension == null));
                    }
                    else if (object.__fontStyle == null && stored.backgroundColor.length > 0) {
                        node.attr(formatString(method['backgroundColor'], <string> stored.backgroundColor), (node.renderExtension == null));
                    }
                }
            }
        });
    }

    public setFontStyle() {
        super.setFontStyle();
        const tagName: ObjectMap<T[]> = {};
        this.cache.visible.forEach(node => {
            if (!includesEnum(node.excludeResource, NODE_RESOURCE.FONT_STYLE)) {
                if ((<any> node.element).__fontStyle != null) {
                    if (tagName[node.tagName] == null) {
                        tagName[node.tagName] = [];
                    }
                    tagName[node.tagName].push(node);
                }
            }
        });
        for (const tag in tagName) {
            const nodes: T[] = tagName[tag];
            const sorted: StyleList = [];
            nodes.forEach(node => {
                let system = false;
                let labelFor: Null<T> = null;
                if (node.companion != null) {
                    labelFor = node;
                    node = (<T> node.companion);
                }
                const element = node.element;
                const nodeId = (labelFor || node).id;
                const stored: FontAttribute = Object.assign({}, (<any> element).__fontStyle);
                if (stored.backgroundColor && stored.backgroundColor.length > 0) {
                    stored.backgroundColor = `@color/${ResourceView.addColor(stored.backgroundColor[0], stored.backgroundColor[2])}`;
                }
                if (stored.fontFamily != null) {
                    let fontFamily = stored.fontFamily.toLowerCase().split(',')[0].replace(/"/g, '').trim();
                    let fontStyle = '';
                    let fontWeight = '';
                    if (stored.color && stored.color.length > 0) {
                        stored.color = `@color/${ResourceView.addColor(stored.color[0], stored.color[2])}`;
                    }
                    if (SETTINGS.useFontAlias && FONTREPLACE_ANDROID[fontFamily] != null) {
                        fontFamily = FONTREPLACE_ANDROID[fontFamily];
                    }
                    if ((FONT_ANDROID[fontFamily] && SETTINGS.targetAPI >= FONT_ANDROID[fontFamily]) || (SETTINGS.useFontAlias && FONTALIAS_ANDROID[fontFamily] && SETTINGS.targetAPI >= FONT_ANDROID[FONTALIAS_ANDROID[fontFamily]])) {
                        system = true;
                        stored.fontFamily = fontFamily;
                        if (stored.fontStyle === 'normal') {
                            delete stored.fontStyle;
                        }
                        if (stored.fontWeight === '400') {
                            delete stored.fontWeight;
                        }
                    }
                    else {
                        fontFamily = convertWord(fontFamily);
                        stored.fontFamily = `@font/${fontFamily + (stored.fontStyle !== 'normal' ? `_${stored.fontStyle}` : '') + (stored.fontWeight !== '400' ? `_${FONTWEIGHT_ANDROID[stored.fontWeight] || stored.fontWeight}` : '')}`;
                        fontStyle = stored.fontStyle;
                        fontWeight = stored.fontWeight;
                        delete stored.fontStyle;
                        delete stored.fontWeight;
                    }
                    if (!system) {
                        const fonts = Resource.STORED.FONTS.get(fontFamily) || {};
                        Object.assign(fonts, { [`${fontStyle}-${fontWeight}`]: true });
                        Resource.STORED.FONTS.set(fontFamily, fonts);
                    }
                }
                const method = METHOD_ANDROID['fontStyle'];
                const keys = Object.keys(method);
                for (let i = 0; i < keys.length; i++) {
                    if (sorted[i] == null) {
                        sorted[i] = {};
                    }
                    const value = stored[keys[i]];
                    if (hasValue(value)) {
                        if (node.supported('android', keys[i])) {
                            const attr = formatString(method[keys[i]], value);
                            if (sorted[i][attr] == null) {
                                sorted[i][attr] = [];
                            }
                            sorted[i][attr].push(nodeId);
                        }
                    }
                }
            });
            const tagStyle = this.tagStyle[tag];
            if (tagStyle != null) {
                for (let i = 0; i < tagStyle.length; i++) {
                    for (const attr in tagStyle[i]) {
                        if (sorted[i][attr] != null) {
                            sorted[i][attr].push(...tagStyle[i][attr]);
                        }
                        else {
                            sorted[i][attr] = tagStyle[i][attr];
                        }
                    }
                }
                this.tagCount[tag] += nodes.filter(item => item.visible).length;
            }
            else {
                this.tagCount[tag] = nodes.filter(item => item.visible).length;
            }
            this.tagStyle[tag] = sorted;
        }
    }

    public setImageSource() {
        this.cache.visible.filter(node => node.tagName === 'IMG' || (node.tagName === 'INPUT' && (<HTMLInputElement> node.element).type === 'image')).forEach(node => {
            const element = (<HTMLImageElement> node.element);
            const object: any = element;
            if (!includesEnum(node.excludeResource, NODE_RESOURCE.IMAGE_SOURCE)) {
                if (object.__imageSource == null || SETTINGS.alwaysReevaluateResources) {
                    const result = (node.tagName === 'IMG' ? ResourceView.addImageSrcSet(element) : ResourceView.addImage({ 'mdpi': element.src }));
                    if (result !== '') {
                        const method = METHOD_ANDROID['imageSource'];
                        node.attr(formatString(method['src'], result), (node.renderExtension == null));
                        object.__imageSource = result;
                    }
                }
            }
        });
    }

    public setOptionArray() {
        super.setOptionArray();
        this.cache.visible.filter(node => node.tagName === 'SELECT').forEach(node => {
            if (!includesEnum(node.excludeResource, NODE_RESOURCE.OPTION_ARRAY)) {
                const stored: ObjectMap<string[]> = (<any> node.element).__optionArray;
                if (stored != null) {
                    const method = METHOD_ANDROID['optionArray'];
                    let result: string[] = [];
                    if (stored.stringArray != null) {
                        result = stored.stringArray.map(value => {
                            value = ResourceView.addString(value);
                            return (value !== '' ? `@string/${value}` : '');
                        }).filter(value => value);
                    }
                    if (stored.numberArray != null) {
                        result = stored.numberArray;
                    }
                    let arrayName = '';
                    const arrayValue = result.join('-');
                    for (const [storedName, storedResult] of Resource.STORED.ARRAYS.entries()) {
                        if (arrayValue === storedResult.join('-')) {
                            arrayName = storedName;
                            break;
                        }
                    }
                    if (arrayName === '') {
                        arrayName = `${node.nodeId}_array`;
                        Resource.STORED.ARRAYS.set(arrayName, result);
                    }
                    node.attr(formatString(method['entries'], arrayName), (node.renderExtension == null));
                }
            }
        });
    }

    public setValueString(supportInline: string[]) {
        super.setValueString(supportInline);
        this.cache.visible.forEach(node => {
            if (!includesEnum(node.excludeResource, NODE_RESOURCE.VALUE_STRING)) {
                const stored: BasicData = (<any> node.element).__valueString;
                if (stored != null) {
                    const result = ResourceView.addString(stored.value, stored.name);
                    if (result !== '') {
                        const method = METHOD_ANDROID['valueString'];
                        let value = (<string> Resource.STORED.STRINGS.get(result));
                        if (node.is(NODE_STANDARD.TEXT) && node.style != null) {
                            const match = (<any> node.style).textDecoration.match(/(underline|line-through)/);
                            if (match != null) {
                                switch (match[0]) {
                                    case 'underline':
                                        value = `<u>${value}</u>`;
                                        break;
                                    case 'line-through':
                                        value = `<strike>${value}</strike>`;
                                        break;
                                }
                                Resource.STORED.STRINGS.set(result, value);
                            }
                        }
                        node.attr(formatString(method['text'], (isNaN(parseInt(result)) || parseInt(result).toString() !== result ? `@string/${result}` : result)), (node.renderExtension == null));
                    }
                }
            }
        });
    }

    public addTheme(template: string, data: {}, options: ObjectMap<any>) {
        const map: ObjectMap<string> = parseTemplate(template);
        if (options.item != null) {
            const root = getTemplateLevel(data, '0');
            for (const name in options.item) {
                let value = options.item[name];
                const hex = parseHex(value);
                if (hex !== '') {
                    value = `@color/${ResourceView.addColor(hex)}`;
                }
                root['1'].push({ name, value });
            }
        }
        const xml = insertTemplateData(map, data);
        this.addFile(options.output.path, options.output.file, xml);
    }

    private processFontStyle(viewData: ViewData<T>) {
        const style = {};
        const layout = {};
        for (const tag in this.tagStyle) {
            style[tag] = {};
            layout[tag] = {};
            let sorted = (<any> this.tagStyle[tag]).filter(item => Object.keys(item).length > 0).sort((a, b) => {
                let maxA = 0;
                let maxB = 0;
                let countA = 0;
                let countB = 0;
                for (const attr in a) {
                    maxA = Math.max(a[attr].length, maxA);
                    countA += a[attr].length;
                }
                for (const attr in b) {
                    if (b[attr] != null) {
                        maxB = Math.max(b[attr].length, maxB);
                        countB += b[attr].length;
                    }
                }
                if (maxA !== maxB) {
                    return (maxA > maxB ? -1 : 1);
                }
                else {
                    return (countA >= countB ? -1 : 1);
                }
            });
            const count = this.tagCount[tag];
            do {
                if (sorted.length === 1) {
                    for (const attr in sorted[0]) {
                        const value = sorted[0][attr];
                        if (value.length > 2) {
                            style[tag][attr] = value;
                        }
                        else {
                            layout[tag][attr] = value;
                        }
                    }
                    sorted.length = 0;
                }
                else {
                    const styleKey: ObjectMap<number[]> = {};
                    const layoutKey: ObjectMap<number[]> = {};
                    for (let i = 0; i < sorted.length; i++) {
                        const filtered: ObjectMap<number[]> = {};
                        const combined: ObjectMap<Set<string>> = {};
                        const deleteKeys = new Set();
                        for (const attr1 in sorted[i]) {
                            if (sorted[i] == null) {
                                continue;
                            }
                            const ids: number[] = sorted[i][attr1];
                            let revalidate = false;
                            if (ids == null || ids.length === 0) {
                                continue;
                            }
                            else if (ids.length === count) {
                                styleKey[attr1] = ids;
                                sorted[i] = null;
                                revalidate = true;
                            }
                            else if (ids.length === 1) {
                                layoutKey[attr1] = ids;
                                sorted[i][attr1] = null;
                                revalidate = true;
                            }
                            if (!revalidate) {
                                const found: ObjectMap<number[]> = {};
                                let merged = false;
                                for (let j = 0; j < sorted.length; j++) {
                                    if (i !== j) {
                                        for (const attr in sorted[j]) {
                                            const compare = sorted[j][attr];
                                            for (const nodeId of ids) {
                                                if (compare.includes(nodeId)) {
                                                    if (found[attr] == null) {
                                                        found[attr] = [];
                                                    }
                                                    found[attr].push(nodeId);
                                                }
                                            }
                                        }
                                    }
                                }
                                for (const attr2 in found) {
                                    if (found[attr2].length > 1) {
                                        filtered[[attr1, attr2].sort().join(';')] = found[attr2];
                                        merged = true;
                                    }
                                }
                                if (!merged) {
                                    filtered[attr1] = ids;
                                }
                            }
                        }
                        for (const attr1 in filtered) {
                            for (const attr2 in filtered) {
                                if (attr1 !== attr2 && filtered[attr1].join('') === filtered[attr2].join('')) {
                                    const index = filtered[attr1].join(',');
                                    if (combined[index] != null) {
                                        combined[index] = new Set([...combined[index], ...attr2.split(';')]);
                                    }
                                    else {
                                        combined[index] = new Set([...attr1.split(';'), ...attr2.split(';')]);
                                    }
                                    deleteKeys.add(attr1).add(attr2);
                                }
                            }
                        }
                        deleteKeys.forEach(value => delete filtered[value]);
                        for (const attrs in filtered) {
                            this.deleteStyleAttribute(sorted, attrs, filtered[attrs]);
                            style[tag][attrs] = filtered[attrs];
                        }
                        for (const index in combined) {
                            const attrs = Array.from(combined[index]).sort().join(';');
                            const ids = index.split(',').map((value: string) => parseInt(value));
                            this.deleteStyleAttribute(sorted, attrs, ids);
                            style[tag][attrs] = ids;
                        }
                    }
                    const shared = Object.keys(styleKey);
                    if (shared.length > 0) {
                        if (shared.length > 1 || styleKey[shared[0]].length > 1) {
                            style[tag][shared.join(';')] = styleKey[shared[0]];
                        }
                        else {
                            Object.assign(layoutKey, styleKey);
                        }
                    }
                    for (const attr in layoutKey) {
                        layout[tag][attr] = layoutKey[attr];
                    }
                    for (let i = 0; i < sorted.length; i++) {
                        if (sorted[i] && Object.keys(sorted[i]).length === 0) {
                            delete sorted[i];
                        }
                    }
                    sorted = sorted.filter((item: number[]) => item && item.length > 0);
                }
            }
            while (sorted.length > 0);
        }
        const resource: ObjectMap<StyleTag[]> = {};
        for (const tagName in style) {
            const tag = style[tagName];
            const tagData: StyleTag[] = [];
            for (const attributes in tag) {
                tagData.push({ attributes, ids: tag[attributes]});
            }
            tagData.sort((a, b) => {
                let [c, d] = [a.ids.length, b.ids.length];
                if (c === d) {
                    [c, d] = [a.attributes.split(';').length, b.attributes.split(';').length];
                }
                return (c >= d ? -1 : 1);
            });
            tagData.forEach((item, index) => item.name = capitalize(tagName) + (index > 0 ? `_${index}` : ''));
            resource[tagName] = tagData;
        }
        const inherit = new Set();
        const map = {};
        for (const tagName in resource) {
            for (const item of (<StyleTag[]> resource[tagName])) {
                for (const id of item.ids) {
                    if (map[id] == null) {
                        map[id] = { styles: [], attributes: [] };
                    }
                    map[id].styles.push(item.name);
                }
            }
            const tagData = layout[tagName];
            if (tagData != null) {
                for (const attr in tagData) {
                    for (const id of (<number[]> tagData[attr])) {
                        if (map[id] == null) {
                            map[id] = { styles: [], attributes: [] };
                        }
                        map[id].attributes.push(attr);
                    }
                }
            }
        }
        for (const id in map) {
            const node: Null<T> = viewData.cache.find(item => item.id === parseInt(id));
            if (node != null) {
                const styles: string[] = map[id].styles;
                const attrs: string[] = map[id].attributes;
                if (styles.length > 0) {
                    inherit.add(styles.join('.'));
                    node.add('_', 'style', `@style/${styles.pop()}`);
                }
                if (attrs.length > 0) {
                    attrs.sort().forEach(value => node.attr(replaceDP(value, true), false));
                }
            }
        }
        for (const styles of inherit) {
            let parent = '';
            (<string> styles).split('.').forEach(value => {
                const match = value.match(/^(\w*?)(?:_([0-9]+))?$/);
                if (match != null) {
                    const tagData = resource[match[1].toUpperCase()][(match[2] == null ? 0 : parseInt(match[2]))];
                    Resource.STORED.STYLES.set(value, { parent, attributes: tagData.attributes });
                    parent = value;
                }
            });
        }
    }

    private deleteStyleAttribute(sorted: any, attrs: string, ids: number[]) {
        attrs.split(';').forEach(value => {
            for (let i = 0; i < sorted.length; i++) {
                if (sorted[i] != null) {
                    let index = -1;
                    let key = '';
                    for (const j in sorted[i]) {
                        if (j === value) {
                            index = i;
                            key = j;
                            i = sorted.length;
                            break;
                        }
                    }
                    if (index !== -1) {
                        sorted[index][key] = sorted[index][key].filter((id: number) => !ids.includes(id));
                        if (sorted[index][key].length === 0) {
                            delete sorted[index][key];
                        }
                        break;
                    }
                }
            }
        });
    }

    private getShapeAttribute(stored: ObjectMap<any>, name: string) {
        switch (name) {
            case 'stroke':
                return (stored.border && stored.border.width !== '0px' ? [{ width: stored.border.width, borderStyle: this.getBorderStyle(stored.border) }] : false);
            case 'backgroundColor':
                return (stored.backgroundColor.length > 0 ? [{ color: stored.backgroundColor }] : false);
            case 'radius':
                return (stored.borderRadius.length === 1 && stored.borderRadius[0] !== '0px' ? [{ radius: stored.borderRadius[0] }] : false);
            case 'radiusInit':
                return (stored.borderRadius.length > 1 ? [] : false);
            case 'radiusAll':
                const result = {};
                stored.borderRadius.forEach((value: string, index: number) => result[`${['topLeft', 'topRight', 'bottomRight', 'bottomLeft'][index]}Radius`] = value);
                return result;
        }
        return false;
    }
}