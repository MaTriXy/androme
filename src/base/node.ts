import { ELEMENT_BLOCK, ELEMENT_INLINE } from '../lib/constant';
import { APP_SECTION, BOX_STANDARD, CSS_STANDARD, NODE_ALIGNMENT, NODE_PROCEDURE, NODE_RESOURCE, NODE_STANDARD } from '../lib/enumeration';

import Container from './container';
import Extension from './extension';

import { assignBounds, getElementCache, getNodeFromElement, getRangeClientRect, hasFreeFormText, hasLineBreak, isPlainText, isStyleElement, newClientRect, setElementCache } from '../lib/dom';
import { convertCamelCase, convertInt, hasBit, hasValue, isPercent, isUnit, searchObject, trimNull } from '../lib/util';

type T = Node;

export default abstract class Node extends Container<T> implements androme.lib.base.Node {
    public static getNodeFromElement<T extends Node>(element: UndefNull<Element>) {
        return getNodeFromElement<T>(element);
    }

    public abstract readonly renderChildren: T[];
    public style: CSSStyleDeclaration;
    public styleMap: StringMap = {};
    public nodeId: string;
    public nodeType = 0;
    public alignmentType = 0;
    public depth = -1;
    public siblingIndex = Number.MAX_VALUE;
    public renderIndex = Number.MAX_VALUE;
    public renderPosition = -1;
    public box: BoxDimensions;
    public bounds: BoxDimensions;
    public linear: BoxDimensions;
    public companion: T;
    public excludeSection = 0;
    public excludeProcedure = 0;
    public excludeResource = 0;
    public documentRoot = false;
    public positioned = false;
    public visible = true;
    public excluded = false;
    public rendered = false;
    public renderExtension = new Set<Extension<T>>();
    public readonly initial: androme.lib.base.InitialData<T>;

    protected abstract _namespaces: Set<string>;
    protected abstract _controlName: string;
    protected abstract _renderParent: T;
    protected abstract _documentParent: T;
    protected abstract readonly _boxAdjustment: BoxModel;
    protected abstract readonly _boxReset: BoxModel;

    private _element: Element;
    private _baseElement: Element;
    private _parent: T;
    private _nodeName: string;
    private _tagName: string;
    private _renderAs: T;
    private _renderDepth: number;
    private _pageflow: boolean;
    private _multiLine: boolean;
    private _lineHeight: number;
    private _overflow: number;
    private _inlineText: boolean;
    private _data = {};
    private _initialized = false;

    protected constructor(
        public readonly id: number,
        element?: Element)
    {
        super();
        this.initial = {
            depth: -1,
            children: [],
            styleMap: {},
            bounds: newClientRect()
        };
        if (element) {
            this._element = element;
            this.init();
        }
    }

    public abstract setNodeType(viewName: string): void;
    public abstract setLayout(width?: number, height?: number): void;
    public abstract setAlignment(): void;
    public abstract applyOptimizations(): void;
    public abstract applyCustomizations(): void;
    public abstract modifyBox(region: number | string, offset: number | null, negative?: boolean): void;
    public abstract valueBox(region: number): string[];
    public abstract localizeString(value: string): string;
    public abstract clone(id?: number, children?: boolean): T;
    public abstract set controlName(value: string);
    public abstract get controlName();
    public abstract set documentParent(value: T);
    public abstract get documentParent(): T;
    public abstract set renderParent(value: T);
    public abstract get renderParent(): T;
    public abstract get linearHorizontal(): boolean;
    public abstract get linearVertical(): boolean;
    public abstract get layoutHorizontal(): boolean;
    public abstract get layoutVertical(): boolean;
    public abstract get inlineWidth(): boolean;
    public abstract get inlineHeight(): boolean;
    public abstract get blockWidth(): boolean;
    public abstract get blockHeight(): boolean;

    public init() {
        if (!this._initialized) {
            if (this.styleElement) {
                const element = <HTMLElement> this._element;
                const styleMap = getElementCache(element, 'styleMap') || {};
                Array.from(element.style).forEach(value => styleMap[convertCamelCase(value)] = element.style[value]);
                this.style = getElementCache(element, 'style') || getComputedStyle(element);
                this.styleMap = Object.assign({}, styleMap);
                Object.assign(this.initial.styleMap, styleMap);
            }
            if (this.id !== 0) {
                setElementCache(this._element, 'node', this);
            }
            this._initialized = true;
        }
    }

    public is(...views: number[]) {
        return views.some(value => this.nodeType === value);
    }

    public of(nodeType: number, ...alignmentType: number[]) {
        return this.nodeType === nodeType && alignmentType.some(value => this.hasAlign(value));
    }

    public attr(obj: string, attr: string, value = '', overwrite = true): string {
        const name = `_${obj || '_'}`;
        if (hasValue(value)) {
            if (this[name] === undefined) {
                this._namespaces.add(obj);
                this[name] = {};
            }
            if (!overwrite && this[name][attr] !== undefined) {
                return '';
            }
            this[name][attr] = value.toString();
        }
        return this[name][attr] || '';
    }

    public namespace(obj: string): StringMap {
        const name = `_${obj || '_'}`;
        return this[name] || {};
    }

    public delete(obj: string, ...attrs: string[]) {
        const name = `_${obj || '_'}`;
        if (this[name]) {
            for (const attr of attrs) {
                if (attr.indexOf('*') !== -1) {
                    for (const [key] of searchObject(this[name], attr)) {
                        delete this[name][key];
                    }
                }
                else {
                    delete this[name][attr];
                }
            }
        }
    }

    public apply(options: {}) {
        if (typeof options === 'object') {
            for (const obj in options) {
                const attrs = options[obj];
                if (typeof attrs === 'object') {
                    for (const attr in attrs) {
                        this.attr(obj, attr, attrs[attr]);
                    }
                    delete options[obj];
                }
            }
        }
    }

    public each(predicate: IteratorPredicate<T, void>, rendered = false) {
        (rendered ? this.renderChildren : this.list).forEach(predicate);
        return this;
    }

    public render(parent: T) {
        this.renderParent = parent;
        this.renderDepth = this.documentRoot || this === parent || hasValue(parent.dataset.target) ? 0 : parent.renderDepth + 1;
        this.rendered = true;
    }

    public hide() {
        this.rendered = true;
        this.visible = false;
    }

    public data(obj: string, attr: string, value?: any, overwrite = true) {
        if (hasValue(value)) {
            if (this._data[obj] === undefined) {
                this._data[obj] = {};
            }
            if (typeof this._data[obj] === 'object') {
                if (overwrite || this._data[obj][attr] === undefined) {
                    this._data[obj][attr] = value;
                }
            }
        }
        return this._data[obj] === undefined || this._data[obj][attr] === undefined ? undefined : this._data[obj][attr];
    }

    public ascend(generated = false, levels = -1) {
        const result: T[] = [];
        const attr = generated ? 'parent' : 'documentParent';
        let current: T = this[attr];
        let i = -1;
        while (current && current.id !== 0 && !result.includes(current)) {
            result.push(current);
            if (++i === levels) {
                break;
            }
            current = current[attr];
        }
        return result;
    }

    public cascade() {
        function cascade(node: T) {
            const current = [...node.list];
            for (const item of node) {
                current.push(...cascade(item));
            }
            return current;
        }
        return cascade(this);
    }

    public inherit(node: T, ...props: string[]) {
        if (this._initialized) {
            function copyMap(source: StringMap, destination: StringMap) {
                for (const attr in source) {
                    if (!destination.hasOwnProperty(attr)) {
                        destination[attr] = source[attr];
                    }
                }
            }
            for (const type of props) {
                switch (type) {
                    case 'initial':
                        Object.assign(this.initial, node.initial);
                        break;
                    case 'base':
                        this.style = node.style;
                        this.documentParent = node.documentParent;
                    case 'dimensions':
                        this.bounds = assignBounds(node.bounds);
                        this.linear = assignBounds(node.linear);
                        this.box = assignBounds(node.box);
                        break;
                    case 'data':
                        for (const obj in this._data) {
                            for (const name in this._data[obj]) {
                                const source = this._data[obj][name];
                                if (typeof source === 'object' && source.inherit === true) {
                                    const destination = node.data(obj, name);
                                    if (destination) {
                                        for (const attr in source) {
                                            switch (typeof source[attr]) {
                                                case 'number':
                                                    destination[attr] += source[attr];
                                                    break;
                                                case 'boolean':
                                                    if (source[attr] === true) {
                                                        destination[attr] = true;
                                                    }
                                                    break;
                                                default:
                                                    destination[attr] = source[attr];
                                                    break;
                                            }
                                        }
                                    }
                                    else {
                                        node.data(obj, name, source);
                                    }
                                    delete this._data[obj][name];
                                }
                            }
                        }
                        break;
                    case 'alignment':
                        ['position', 'display', 'verticalAlign', 'cssFloat', 'clear'].forEach(value => {
                            this.styleMap[value] = node.css(value);
                            this.initial.styleMap[value] = node.cssInitial(value);
                        });
                        if (node.css('marginLeft') === 'auto') {
                            this.styleMap.marginLeft = 'auto';
                            this.initial.styleMap.marginLeft = 'auto';
                        }
                        if (node.css('marginRight') === 'auto') {
                            this.styleMap.marginRight = 'auto';
                            this.initial.styleMap.marginRight = 'auto';
                        }
                        break;
                    case 'style':
                        const style = { whiteSpace: node.css('whiteSpace') };
                        for (const attr in node.style) {
                            if (attr.startsWith('font') || attr.startsWith('color')) {
                                const key = convertCamelCase(attr);
                                style[key] = node.style[key];
                            }
                        }
                        this.css(style);
                        break;
                    case 'styleMap':
                        copyMap(node.styleMap, this.styleMap);
                        break;
                }
            }
        }
    }

    public alignedVertically(previous: T | null, cleared = new Map<T, string>(), firstNode = false) {
        if (previous && this.documentParent.baseElement === previous.documentParent.baseElement) {
            const widthParent = this.documentParent.has('width', CSS_STANDARD.UNIT) ? this.documentParent.toInt('width') : this.documentParent.box.width;
            return (
                this.lineBreak ||
                previous.lineBreak ||
                previous.blockStatic ||
                (previous.bounds && previous.bounds.width > widthParent && (!previous.textElement || previous.css('whiteSpace') === 'nowrap')) ||
                (previous.float === 'left' && this.autoMarginRight) ||
                (previous.float === 'right' && this.autoMarginLeft) ||
                (!previous.floating && ((!this.inlineElement && !this.floating) || this.blockStatic)) ||
                (previous.plainText && previous.multiLine && (this.parent && !this.parent.is(NODE_STANDARD.RELATIVE))) ||
                (this.blockStatic && (!previous.inlineElement || (cleared.has(previous) && previous.floating))) ||
                (!firstNode && cleared.has(this)) ||
                (!firstNode && this.floating && previous.floating && this.linear.top >= previous.linear.bottom)
            );
        }
        return false;
    }

    public intersect(rect: BoxDimensions, dimension = 'linear') {
        const bounds: BoxDimensions = this[dimension] || this.linear;
        const top = rect.top > bounds.top && rect.top < bounds.bottom;
        const right = Math.floor(rect.right) > Math.ceil(bounds.left) && rect.right < bounds.right;
        const bottom = Math.floor(rect.bottom) > Math.ceil(bounds.top) && rect.bottom < bounds.bottom;
        const left = rect.left > bounds.left && rect.left < bounds.right;
        return (top && (left || right)) || (bottom && (left || right));
    }

    public intersectX(rect: BoxDimensions, dimension = 'linear') {
        const bounds: BoxDimensions = this[dimension] || this.linear;
        return (
            (rect.top >= bounds.top && rect.top < bounds.bottom) ||
            (rect.bottom > bounds.top && rect.bottom <= bounds.bottom) ||
            (bounds.top >= rect.top && this[dimension].bottom <= rect.bottom) ||
            (rect.top >= bounds.top && rect.bottom <= bounds.bottom)
        );
    }

    public intersectY(rect: BoxDimensions, dimension = 'linear') {
        const bounds: BoxDimensions = this[dimension] || this.linear;
        return (
            (rect.left >= bounds.left && rect.left < bounds.right) ||
            (rect.right > bounds.left && rect.right <= bounds.right) ||
            (bounds.left >= rect.left && bounds.right <= rect.right) ||
            (rect.left >= bounds.left && rect.right <= bounds.right)
        );
    }

    public withinX(rect: BoxDimensions, dimension = 'linear') {
        const bounds: BoxDimensions = this[dimension] || this.linear;
        return bounds.top >= rect.top && bounds.bottom <= rect.bottom;
    }

    public withinY(rect: BoxDimensions, dimension = 'linear') {
        const bounds: BoxDimensions = this[dimension] || this.linear;
        return bounds.left >= rect.left && bounds.right <= rect.right;
    }

    public outsideX(rect: BoxDimensions, dimension = 'linear') {
        const bounds: BoxDimensions = this[dimension] || this.linear;
        return bounds.right < rect.left || bounds.left > rect.right;
    }

    public outsideY(rect: BoxDimensions, dimension = 'linear') {
        const bounds: BoxDimensions = this[dimension] || this.linear;
        return bounds.bottom < rect.top || bounds.top > rect.bottom;
    }

    public css(attr: object | string, value = ''): string {
        if (typeof attr === 'object') {
            Object.assign(this.styleMap, attr);
            return '';
        }
        else {
            if (arguments.length === 2) {
                this.styleMap[attr] = hasValue(value) ? value : '';
            }
            return this.styleMap[attr] || (this.style && this.style[attr]) || '';
        }
    }

    public cssInitial(attr: string, complete = false) {
        return this.initial.styleMap[attr] || (complete ? this.css(attr) : '');
    }

    public cssParent(attr: string, startChild = false, ignoreHidden = false) {
        let result = '';
        if (this.baseElement) {
            let current = startChild ? this : Node.getNodeFromElement(this.baseElement.parentElement);
            while (current) {
                result = current.initial.styleMap[attr] || '';
                if (result || current.documentBody) {
                    if (ignoreHidden && !current.visible) {
                        result = '';
                    }
                    break;
                }
                current = Node.getNodeFromElement(current.baseElement.parentElement);
            }
        }
        return result;
    }

    public has(attr: string, checkType: number = 0, options?: ObjectMap<string | string[]>) {
        const value = (options && options.map === 'initial' ? this.initial.styleMap : this.styleMap)[attr];
        if (hasValue(value)) {
            switch (value) {
                case '0px':
                    if (hasBit(checkType, CSS_STANDARD.ZERO)) {
                        return true;
                    }
                case 'left':
                    if (hasBit(checkType, CSS_STANDARD.LEFT)) {
                        return true;
                    }
                case 'baseline':
                    if (hasBit(checkType, CSS_STANDARD.BASELINE)) {
                        return true;
                    }
                case 'auto':
                    if (hasBit(checkType, CSS_STANDARD.AUTO)) {
                        return true;
                    }
                case 'none':
                case 'initial':
                case 'normal':
                case 'transparent':
                case 'rgba(0, 0, 0, 0)':
                    return false;
                default:
                    if (options) {
                        if (options.not) {
                            if (Array.isArray(options.not)) {
                                for (const exclude of options.not) {
                                    if (value === exclude) {
                                        return false;
                                    }
                                }
                            }
                            else {
                                if (value === options.not) {
                                    return false;
                                }
                            }
                        }
                    }
                    let result = checkType === 0;
                    if (hasBit(checkType, CSS_STANDARD.UNIT) && isUnit(value)) {
                        result = true;
                    }
                    if (hasBit(checkType, CSS_STANDARD.PERCENT) && isPercent(value)) {
                        result = true;
                    }
                    if (hasBit(checkType, CSS_STANDARD.AUTO)) {
                        result = false;
                    }
                    return result;
            }
        }
        return false;
    }

    public hasBit(attr: string, value: number) {
        if (this[attr] !== undefined) {
            return hasBit(this[attr], value);
        }
        return false;
    }

    public toInt(attr: string, defaultValue = 0, options?: StringMap) {
        const value = (options && options.map === 'initial' ? this.initial.styleMap : this.styleMap)[attr];
        return parseInt(value) || defaultValue;
    }

    public hasAlign(value: number) {
        return hasBit(this.alignmentType, value);
    }

    public setExclusions() {
        if (this.styleElement) {
            [['excludeSection', APP_SECTION], ['excludeProcedure', NODE_PROCEDURE], ['excludeResource', NODE_RESOURCE]].forEach((item: [string, any]) => {
                let exclude = this.dataset[item[0]] || '';
                if (this._element.parentElement) {
                    exclude += '|' + trimNull(this._element.parentElement.dataset[`${item[0]}Child`]);
                }
                exclude.split('|').map(value => value.toUpperCase().trim()).forEach(value => {
                    if (item[1][value] !== undefined) {
                        this[item[0]] |= item[1][value];
                    }
                });
            });
        }
    }

    public setBounds(calibrate = false) {
        if (this._element) {
            if (!calibrate) {
                if (this.styleElement) {
                    this.bounds = assignBounds(this._element.getBoundingClientRect());
                }
                else {
                    const bounds = getRangeClientRect(this._element);
                    if (bounds[0]) {
                        this.bounds = <BoxDimensions> bounds[0];
                    }
                }
            }
        }
        if (this.bounds) {
            if (this.initial.bounds.width === 0 && this.initial.bounds.height === 0) {
                Object.assign(this.initial.bounds, assignBounds(this.bounds));
            }
            this.linear = {
                top: this.bounds.top - (this.marginTop > 0 ? this.marginTop : 0),
                right: this.bounds.right + this.marginRight,
                bottom: this.bounds.bottom + this.marginBottom,
                left: this.bounds.left - (this.marginLeft > 0 ? this.marginLeft : 0),
                width: 0,
                height: 0
            };
            this.box = {
                top: this.bounds.top + (this.paddingTop + this.borderTopWidth),
                right: this.bounds.right - (this.paddingRight + this.borderRightWidth),
                bottom: this.bounds.bottom - (this.paddingBottom + this.borderBottomWidth),
                left: this.bounds.left + (this.paddingLeft + this.borderLeftWidth),
                width: 0,
                height: 0
            };
            this.setDimensions();
        }
    }

    public setDimensions(region = ['linear', 'box']) {
        for (const dimension of region) {
            const bounds = this[dimension];
            bounds.width = this.bounds.width;
            if (!this.plainText) {
                switch (dimension) {
                    case 'linear':
                        bounds.width += (this.marginLeft > 0 ? this.marginLeft : 0) + this.marginRight;
                        break;
                    case 'box':
                        bounds.width -= this.paddingLeft + this.borderLeftWidth + this.paddingRight + this.borderRightWidth;
                        break;
                }
            }
            bounds.height = bounds.bottom - bounds.top;
            if (this.initial[dimension] === undefined) {
                this.initial[dimension] = assignBounds(bounds);
            }
        }
    }

    public setMultiLine() {
        if (this._element) {
            this._multiLine = false;
            switch (this._element.tagName) {
                case 'IMG':
                case 'INPUT':
                case 'BUTTON':
                case 'TEXTAREA':
                case 'HR':
                case 'IFRAME':
                    return;
                default:
                    if (this.textElement) {
                        const [bounds, multiLine] = getRangeClientRect(this._element);
                        if (this.plainText) {
                            if (bounds) {
                                this.bounds = bounds;
                                this.setBounds(true);
                            }
                            else {
                                this.hide();
                            }
                            this.multiLine = multiLine;
                        }
                        else {
                            if (!this.hasWidth && (this.blockStatic || this.display === 'table-cell' || hasLineBreak(this._element))) {
                                this.multiLine = multiLine;
                            }
                        }
                    }
                    break;
            }
        }
        else {
            this._multiLine = false;
        }
    }

    public replaceNode(node: T, withNode: T, append = true) {
        for (let i = 0; i < this.length; i++) {
            if (node === this.item(i)) {
                this.item(i, withNode);
                withNode.parent = this;
                return true;
            }
        }
        if (append) {
            withNode.parent = this;
            return true;
        }
        return false;
    }

    public appendRendered(node: T) {
        if (this.renderChildren.indexOf(node) === -1) {
            node.renderIndex = this.renderChildren.length;
            this.renderChildren.push(node);
        }
    }

    public resetBox(region: number, node?: T, negative = false) {
        const attrs: string[] = [];
        if (hasBit(region, BOX_STANDARD.MARGIN)) {
            attrs.push('marginTop', 'marginRight', 'marginBottom', 'marginLeft');
        }
        if (hasBit(region, BOX_STANDARD.PADDING)) {
            attrs.push('paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft');
        }
        for (const attr of attrs) {
            this._boxReset[attr] = 1;
            if (node) {
                node.modifyBox(attr, this[attr], negative);
            }
        }
    }

    public removeElement() {
        if (this._element) {
            if (this._nodeName === undefined) {
                this._nodeName = this.nodeName;
            }
            if (this._tagName === undefined) {
                this._tagName = this.tagName;
            }
            this._baseElement = this._element;
            this._element = undefined as any;
        }
    }

    public getParentElementAsNode(negative = false) {
        if (this._element) {
            let parent = Node.getNodeFromElement(this._element.parentElement);
            if (!this.pageflow) {
                let found = false;
                let previous: T | null = null;
                let relativeParent: T | null = null;
                let outside = false;
                while (parent && parent.id !== 0) {
                    if (!relativeParent && this.position === 'absolute') {
                        if (!['static', 'initial'].includes(parent.position)) {
                            const top = convertInt(this.top);
                            const left = convertInt(this.left);
                            if ((top >= 0 && left >= 0) || !negative || (negative && Math.abs(top) <= parent.marginTop && Math.abs(left) <= parent.marginLeft) || this.imageElement) {
                                if (negative &&
                                    !parent.documentRoot &&
                                    top !== 0 &&
                                    left !== 0 &&
                                    this.bottom === null &&
                                    this.right === null &&
                                    (this.outsideX(parent.linear) || this.outsideY(parent.linear)))
                                {
                                    outside = true;
                                }
                                else {
                                    found = true;
                                    break;
                                }
                            }
                            relativeParent = parent;
                        }
                    }
                    else {
                        if ((this.withinX(parent.box) && this.withinY(parent.box)) ||
                            (previous && (
                                (this.linear.top >= parent.linear.top && this.linear.top < previous.linear.top) ||
                                (this.linear.right <= parent.linear.right && this.linear.right > previous.linear.right) ||
                                (this.linear.bottom <= parent.linear.bottom && this.linear.bottom > previous.linear.bottom) ||
                                (this.linear.left >= parent.linear.left && this.linear.left < previous.linear.left)
                           )))
                        {
                            found = true;
                            break;
                        }
                    }
                    previous = parent;
                    parent = Node.getNodeFromElement(parent.element.parentElement);
                }
                if (!found && !outside) {
                    parent = relativeParent;
                }
            }
            return parent;
        }
        return null;
    }

    public previousSibling(pageflow = false, lineBreak = true, excluded = true) {
        let element: Element | null = null;
        if (this._element) {
            element = <Element> this._element.previousSibling;
        }
        else if (this.initial.children.length > 0) {
            const list = this.initial.children.filter(node => pageflow ? node.pageflow : node.siblingflow);
            element = list.length > 0 ? <Element> list[0].element.previousSibling : null;
        }
        while (element) {
            const node = Node.getNodeFromElement(element);
            if (node && !(node.lineBreak && !lineBreak) && !(node.excluded && !excluded) && ((pageflow && node.pageflow) || (!pageflow && node.siblingflow))) {
                return node;
            }
            element = <Element> element.previousSibling;
        }
        return null;
    }

    public nextSibling(pageflow = false, lineBreak = true, excluded = true) {
        let element: Element | null = null;
        if (this._element) {
            element = <Element> this._element.nextSibling;
        }
        else if (this.initial.children.length > 0) {
            const list = this.initial.children.filter(node => pageflow ? node.pageflow : node.siblingflow);
            element = list.length > 0 ? <Element> list[0].element.nextSibling : null;
        }
        while (element) {
            const node = Node.getNodeFromElement(element);
            if (node && !(node.lineBreak && !lineBreak) && !(node.excluded && !excluded) && (pageflow && node.pageflow || !pageflow && node.siblingflow)) {
                return node;
            }
            element = <Element> element.nextSibling;
        }
        return null;
    }

    public actualLeft(dimension = 'linear') {
        return this.companion && !this.companion.visible && this.companion[dimension] ? Math.min(this[dimension].left, this.companion[dimension].left) : this[dimension].left;
    }

    public actualRight(dimension = 'linear') {
        return this.companion && !this.companion.visible && this.companion[dimension] ? Math.max(this[dimension].right, this.companion[dimension].right) : this[dimension].right;
    }

    private boxAttribute(region: string, direction: string) {
        const attr = region + direction;
        if (this.styleElement) {
            const value = this.css(attr);
            if (isPercent(value)) {
                return this.style[attr] && this.style[attr] !== value ? convertInt(this.style[attr]) : this.documentParent.box[(direction === 'Left' || direction === 'Right' ? 'width' : 'height')] * (convertInt(value) / 100);
            }
            else {
                return convertInt(value);
            }
        }
        else {
            return convertInt(this.css(attr));
        }
    }

    private getOverflow() {
        if (this._overflow === undefined) {
            this._overflow = 0;
            if (this.styleElement) {
                const [overflow, overflowX, overflowY] = [this.css('overflow'), this.css('overflowX'), this.css('overflowY')];
                if (this.toInt('width') > 0 && (overflow === 'scroll' || overflowX === 'scroll' || (overflowX === 'auto' && this._element.clientWidth !== this._element.scrollWidth))) {
                    this._overflow |= NODE_ALIGNMENT.HORIZONTAL;
                }
                if (this.toInt('height') > 0 && (overflow === 'scroll' || overflowY === 'scroll' || (overflowY === 'auto' && this._element.clientHeight !== this._element.scrollHeight))) {
                    this._overflow |= NODE_ALIGNMENT.VERTICAL;
                }
            }
        }
        return this._overflow;
    }

    set parent(value) {
        if (value !== this._parent) {
            if (this._parent) {
                this._parent.remove(this);
            }
            this._parent = value;
        }
        if (value) {
            if (!value.contains(this)) {
                value.append(this);
                if (!value.styleElement && this.siblingIndex !== -1) {
                    value.siblingIndex = Math.min(this.siblingIndex, value.siblingIndex);
                }
            }
            if (this.initial.depth === -1) {
                this.initial.depth = value.depth + 1;
            }
            this.depth = value.depth + 1;
        }
        else {
            this.depth = -1;
        }
    }
    get parent() {
        return this._parent;
    }

    set nodeName(value) {
        this._nodeName = value;
    }
    get nodeName() {
        return (
            this._nodeName ||
            (this.styleElement ? (this.tagName === 'INPUT' ? (<HTMLInputElement> this._element).type : this.tagName).toUpperCase() : '')
        );
    }

    get tagName() {
        return (this._tagName || (this._element && this._element.tagName) || '').toUpperCase();
    }

    set element(value) {
        this._element = value;
    }
    get element() {
        return this._element || { dataset: {}, style: {} };
    }

    set baseElement(value) {
        this._baseElement = value;
    }
    get baseElement() {
        return this._baseElement || this.element;
    }

    get htmlElement() {
        return this._element instanceof HTMLElement;
    }

    get styleElement() {
        return this.htmlElement || this.svgElement;
    }

    get domElement() {
        return this.styleElement || this.plainText;
    }

    get imageElement() {
        return this.tagName === 'IMG';
    }

    get svgElement() {
        return this.tagName === 'SVG';
    }

    get textElement() {
        return this.plainText || this.inlineText;
    }

    get groupElement() {
        return !this.domElement && this.length > 0;
    }

    get documentBody() {
        return this._element === document.body;
    }

    set renderAs(value) {
        if (!this.rendered && !value.rendered) {
            this._renderAs = value;
        }
    }
    get renderAs() {
        return this._renderAs;
    }

    set renderDepth(value) {
        this._renderDepth = value;
    }
    get renderDepth() {
        if (this._renderDepth === undefined) {
            if (this.documentRoot) {
                this._renderDepth = 0;
            }
            else {
                if (this.parent) {
                    this._renderDepth = this.parent.renderDepth + 1;
                }
            }
        }
        return this._renderDepth || 0;
    }

    get dataset(): DOMStringMap {
        return this._element instanceof HTMLElement ? this._element.dataset : {};
    }

    get extension() {
        return this.dataset.ext ? this.dataset.ext.split(',')[0].trim() : '';
    }

    get flex(): Flexbox {
        const style = this.style;
        if (style) {
            return {
                enabled: ((style.display as string).indexOf('flex') !== -1),
                direction: style.flexDirection as string,
                basis: style.flexBasis as string,
                grow: convertInt(style.flexGrow),
                shrink: convertInt(style.flexShrink),
                wrap: style.flexWrap as string,
                alignSelf: (!this.has('alignSelf') && this.documentParent.has('alignItems') ? this.documentParent.css('alignItems') : style.alignSelf) as string,
                justifyContent: style.justifyContent as string,
                order: convertInt(style.order)
            };
        }
        return <Flexbox> { enabled: false };
    }

    get viewWidth() {
        return this.inlineStatic || this.has('width', CSS_STANDARD.PERCENT) ? 0 : this.toInt('width') || this.toInt('minWidth');
    }
    get viewHeight() {
        return this.inlineStatic || this.has('height', CSS_STANDARD.PERCENT) ? 0 : this.toInt('height') || this.toInt('minHeight');
    }

    get hasWidth() {
        return this.inlineStatic ? false : this.has('width', CSS_STANDARD.UNIT | CSS_STANDARD.PERCENT, { map: 'initial', not: ['0px', '0%'] }) || this.toInt('minWidth') > 0;
    }
    get hasHeight() {
        return this.inlineStatic ? false : this.has('height', CSS_STANDARD.UNIT | CSS_STANDARD.PERCENT, { map: 'initial', not: ['0px', '0%'] }) || this.toInt('minHeight') > 0;
    }

    get lineHeight() {
        if (this.rendered) {
            if (this._lineHeight === undefined) {
                this._lineHeight = 0;
                if (this.length === 0 && !this.renderParent.linearHorizontal) {
                    const lineHeight = this.toInt('lineHeight');
                    if (this.inlineElement) {
                        this._lineHeight = lineHeight || this.documentParent.toInt('lineHeight');
                    }
                    else {
                        this._lineHeight = lineHeight;
                    }
                }
            }
            return this._lineHeight;
        }
        return 0;
    }

    get display() {
        return this.css('display');
    }

    get position() {
        return this.css('position');
    }

    get top() {
        const value = this.styleMap.top;
        return !value || value === 'auto' ? null : convertInt(value);
    }
    get right() {
        const value = this.styleMap.right;
        return !value || value === 'auto' ? null : convertInt(value);
    }
    get bottom() {
        const value = this.styleMap.bottom;
        return !value || value === 'auto' ? null : convertInt(value);
    }
    get left() {
        const value = this.styleMap.left;
        return !value || value === 'auto' ? null : convertInt(value);
    }

    get marginTop() {
        return this.inlineStatic ? 0 : this.boxAttribute('margin', 'Top');
    }
    get marginRight() {
        return this.boxAttribute('margin', 'Right');
    }
    get marginBottom() {
        return this.inlineStatic ? 0 : this.boxAttribute('margin', 'Bottom');
    }
    get marginLeft() {
        return this.boxAttribute('margin', 'Left');
    }

    get borderTopWidth() {
        return this.css('borderTopStyle') !== 'none' ? convertInt(this.css('borderTopWidth')) : 0;
    }
    get borderRightWidth() {
        return this.css('borderRightStyle') !== 'none' ? convertInt(this.css('borderRightWidth')) : 0;
    }
    get borderBottomWidth() {
        return this.css('borderBottomStyle') !== 'none' ? convertInt(this.css('borderBottomWidth')) : 0;
    }
    get borderLeftWidth() {
        return this.css('borderLeftStyle') !== 'none' ? convertInt(this.css('borderLeftWidth')) : 0;
    }

    get paddingTop() {
        return this.boxAttribute('padding', 'Top');
    }
    get paddingRight() {
        return this.boxAttribute('padding', 'Right');
    }
    get paddingBottom() {
        return this.boxAttribute('padding', 'Bottom');
    }
    get paddingLeft() {
        return this.boxAttribute('padding', 'Left');
    }

    set pageflow(value) {
        this._pageflow = value;
    }
    get pageflow() {
        if (this._pageflow === undefined) {
            const value = this.position;
            return value === 'static' || value === 'initial' || value === 'relative' || this.alignOrigin;
        }
        return this._pageflow;
    }

    get siblingflow() {
        const value = this.position;
        return !(value === 'absolute' || value === 'fixed');
    }

    get inline() {
        const value = this.display;
        return value === 'inline' || (value === 'initial' && ELEMENT_INLINE.includes(this.tagName));
    }

    get inlineElement() {
        const position = this.position;
        const display = this.display;
        return this.inline || display.indexOf('inline') !== -1 || display === 'table-cell' || this.floating || ((position === 'absolute' || position === 'fixed') && this.alignOrigin);
    }

    get inlineStatic() {
        return this.inline && !this.floating && !this.imageElement;
    }

    get inlineText() {
        if (this._inlineText === undefined) {
            switch (this.tagName) {
                case 'INPUT':
                case 'BUTTON':
                case 'IMG':
                case 'SELECT':
                case 'TEXTAREA':
                    this._inlineText = false;
                    break;
                default:
                    this._inlineText = (
                        this.htmlElement &&
                        hasFreeFormText(this._element) &&
                        (this.initial.children.length === 0 || this.initial.children.every(node => !!getElementCache(node.element, 'inlineSupport'))) &&
                        (this._element.childNodes.length === 0 || !Array.from(this._element.childNodes).some((element: Element) => {
                            const node = Node.getNodeFromElement(element);
                            return !!node && !node.lineBreak && (!node.excluded || !node.visible);
                        }))
                    );
                    break;
            }
        }
        return this._inlineText;
    }

    get plainText() {
        return this._nodeName === 'PLAINTEXT';
    }

    get lineBreak() {
        return this.tagName === 'BR';
    }

    get block() {
        const value = this.display;
        return value === 'block' || value === 'list-item' || (value === 'initial' && ELEMENT_BLOCK.includes(this.tagName));
    }

    get blockStatic() {
        return this.block && this.siblingflow && (!this.floating || this.cssInitial('width') === '100%');
    }

    get alignOrigin() {
        return this.top === null && this.right === null && this.bottom === null && this.left === null;
    }

    get alignNegative() {
        return this.toInt('top') < 0 || this.toInt('left') < 0;
    }

    get autoMargin() {
        return this.blockStatic && (this.initial.styleMap.marginLeft === 'auto' || this.initial.styleMap.marginRight === 'auto');
    }

    get autoMarginLeft() {
        return this.blockStatic && this.initial.styleMap.marginLeft === 'auto' && this.initial.styleMap.marginRight !== 'auto';
    }

    get autoMarginRight() {
        return this.blockStatic && this.initial.styleMap.marginLeft !== 'auto' && this.initial.styleMap.marginRight === 'auto';
    }

    get autoMarginHorizontal() {
        return this.blockStatic && this.initial.styleMap.marginLeft === 'auto' && this.initial.styleMap.marginRight === 'auto';
    }

    get autoMarginVertical() {
        return this.blockStatic && this.initial.styleMap.marginTop === 'auto' && this.initial.styleMap.marginBottom === 'auto';
    }

    get floating() {
        const value = this.css('cssFloat');
        return this.position !== 'absolute' ? (value === 'left' || value === 'right') : false;
    }

    get float() {
        return this.floating ? this.css('cssFloat') : 'none';
    }

    get textContent() {
        if (this._element) {
            if (this._element instanceof HTMLElement) {
                return this._element.innerText || this._element.innerHTML;
            }
            else if (this._element.nodeName === '#text') {
                return this._element.textContent || '';
            }
        }
        return '';
    }

    get overflowX() {
        return hasBit(this.getOverflow(), NODE_ALIGNMENT.HORIZONTAL);
    }
    get overflowY() {
        return hasBit(this.getOverflow(), NODE_ALIGNMENT.VERTICAL);
    }

    get baseline() {
        const value = this.css('verticalAlign');
        return (value === 'baseline' || value === 'initial' || value === 'unset') && this.siblingflow;
    }

    get baselineInside() {
        return this.nodes.length > 0 ? this.nodes.every(node => node.baseline) : this.baseline;
    }

    set multiLine(value) {
        this._multiLine = value;
    }
    get multiLine() {
        if (this._multiLine === undefined) {
            this.setMultiLine();
        }
        return this._multiLine;
    }

    get preserveWhiteSpace() {
        const value = this.css('whiteSpace');
        return value === 'pre' || value === 'pre-wrap';
    }

    get actualHeight() {
        return this.plainText ? this.bounds.bottom - this.bounds.top : this.bounds.height;
    }

    get singleChild() {
        return this.rendered ? this.renderParent.length === 1 : this.parent.length === 1;
    }

    get dir(): string {
        switch (this.css('direction')) {
            case 'unset':
            case 'inherit':
                let parent = this.documentParent;
                do {
                    const value = parent.dir;
                    if (value !== '') {
                        return value;
                    }
                    parent = parent.documentParent;
                }
                while (parent.id !== 0);
                return '';
            case 'rtl':
                return 'rtl';
            default:
                return 'ltr';
        }
    }

    get nodes() {
        return this.rendered ? this.renderChildren : this.list;
    }

    get previousElementSibling() {
        let element = <Element> this.baseElement.previousSibling;
        while (element) {
            if (isPlainText(element) || isStyleElement(element) || element.tagName === 'BR') {
                return element;
            }
            element = <Element> element.previousSibling;
        }
        return null;
    }
    get nextElementSibling() {
        let element = <Element> this.baseElement.nextSibling;
        while (element) {
            if (isPlainText(element) || isStyleElement(element) || element.tagName === 'BR') {
                return element;
            }
            element = <Element> element.nextSibling;
        }
        return null;
    }

    get center(): Point {
        return {
            x: this.bounds.left + Math.floor(this.bounds.width / 2),
            y: this.bounds.top + Math.floor(this.actualHeight / 2)
        };
    }
}