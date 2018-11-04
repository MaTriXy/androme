import { Constraint, LocalSettings } from './types/local';

import { BUILD_ANDROID } from './lib/enumeration';
import { AXIS_ANDROID, BOX_ANDROID, NODE_ANDROID, RESERVED_JAVA } from './lib/constant';
import { FunctionResult, API_ANDROID, DEPRECATED_ANDROID } from './customizations';

import NodeList = androme.lib.base.NodeList;

import { calculateBias, generateId, replaceRTL, stripId } from './lib/util';

import $enum = androme.lib.enumeration;
import $const = androme.lib.constant;
import $util = androme.lib.util;
import $dom = androme.lib.dom;

export default (Base: Constructor<androme.lib.base.Node>) => {
    return class View extends Base implements androme.lib.base.Node {
        public static documentBody() {
            if (View._documentBody == null) {
                const body = new View(0, document.body);
                body.hide();
                body.setBounds();
                View._documentBody = body;
            }
            return View._documentBody;
        }

        public static getCustomizationValue(api: number, tagName: string, obj: string, attr: string) {
            for (const build of [API_ANDROID[api], API_ANDROID[0]]) {
                const value = $util.optional(build, `customizations.${tagName}.${obj}.${attr}`);
                if ($util.isString(value)) {
                    return value;
                }
            }
            return '';
        }

        public static getControlName(nodeType: number): string {
            return NODE_ANDROID[$enum.NODE_STANDARD[nodeType]];
        }

        private static _documentBody: View;

        private static getPaddedHeight(node: View) {
            return node.paddingTop + node.paddingBottom + node.borderTopWidth + node.borderBottomWidth;
        }

        public readonly constraint: Constraint = { current: {} } as any;
        public readonly renderChildren: View[] = [];

        protected _namespaces = new Set(['android', 'app']);
        protected _controlName: string;
        protected _renderParent: View;
        protected _documentParent: View;
        protected readonly _boxAdjustment: BoxModel = $dom.newBoxModel();
        protected readonly _boxReset: BoxModel = $dom.newBoxModel();

        private _android: StringMap = {};
        private _app: StringMap = {};
        private _localSettings: LocalSettings & ObjectMap<any> = {
            targetAPI: 0,
            supportRTL: false
        };

        constructor(
            id = 0,
            element?: Element,
            afterInit?: SelfWrapped<View, void>)
        {
            super(id, element);
            if (afterInit) {
                afterInit(this);
            }
        }

        public attr(obj: string, attr: string, value = '', overwrite = true) {
            const result = {};
            if (!this.supported(obj, attr, result)) {
                return '';
            }
            if (Object.keys(result).length > 0) {
                if ($util.isString(result['obj'])) {
                    obj = result['obj'];
                }
                if ($util.isString(result['attr'])) {
                    attr = result['attr'];
                }
                if ($util.isString(result['value'])) {
                    value = result['value'];
                }
                if (typeof result['overwrite'] === 'boolean') {
                    overwrite = result['overwrite'];
                }
            }
            return super.attr(obj, attr, value, overwrite);
        }

        public android(attr: string, value = '', overwrite = true) {
            this.attr('android', attr, value, overwrite);
            return this._android[attr] || '';
        }

        public app(attr: string, value = '', overwrite = true) {
            this.attr('app', attr, value, overwrite);
            return this._app[attr] || '';
        }

        public apply(options: {}) {
            if (typeof options === 'object') {
                const local = Object.assign({}, options);
                super.apply(local);
                for (const obj in local) {
                    this.formatted(`${obj}="${local[obj]}"`);
                }
            }
        }

        public formatted(value: string, overwrite = true) {
            const match = value.match(/^(?:([a-z]+):)?(\w+)="((?:@+?[a-z]+\/)?.+)"$/);
            if (match) {
                this.attr(match[1] || '_', match[2], match[3], overwrite);
            }
        }

        public anchor(position: string, adjacent?: string, orientation?: string, overwrite?: boolean) {
            if (arguments.length === 1 ||
                this.constraint.current[position] == null ||
                !this.constraint.current[position].overwrite ||
                (orientation && !this.constraint[orientation]))
            {
                if (overwrite == null) {
                    overwrite = adjacent === 'parent' || adjacent === 'true';
                }
                this[this.renderParent.controlName === NODE_ANDROID.RELATIVE ? 'android' : 'app'](position, adjacent, overwrite);
                if (orientation) {
                    this.constraint[orientation] = true;
                }
                this.constraint.current[position] = { adjacent, orientation, overwrite };
            }
        }

        public alignParent(position: string) {
            if (this.renderParent.is($enum.NODE_STANDARD.CONSTRAINT, $enum.NODE_STANDARD.RELATIVE)) {
                position = $util.capitalize(position);
                if (this.renderParent.controlName === NODE_ANDROID.CONSTRAINT) {
                    const attr = `layout_constraint${position}_to${position}Of`;
                    return this.app(this.localizeString(attr)) === 'parent' || this.app(attr) === 'parent';
                }
                else {
                    const attr = `layout_alignParent${position}`;
                    return this.android(this.localizeString(attr)) === 'true' || this.android(attr) === 'true';
                }
            }
            return false;
        }

        public horizontalBias() {
            const parent = this.documentParent;
            if (parent !== this) {
                const left = Math.max(0, this.linear.left - parent.box.left);
                const right = Math.max(0, parent.box.right - this.linear.right);
                return calculateBias(left, right, this.localSettings.constraintPercentAccuracy);
            }
            return 0.5;
        }

        public verticalBias() {
            const parent = this.documentParent;
            if (parent !== this) {
                const top = Math.max(0, this.linear.top - parent.box.top);
                const bottom = Math.max(0, parent.box.bottom - this.linear.bottom);
                return calculateBias(top, bottom, this.localSettings.constraintPercentAccuracy);
            }
            return 0.5;
        }

        public modifyBox(region: number | string, offset: number | null, negative = false) {
            const name = typeof region === 'number' ? $util.convertEnum(region, $enum.BOX_STANDARD, BOX_ANDROID) : '';
            if (offset !== 0 && (name !== '' || $util.isString(region))) {
                const attr = $util.isString(region) ? region : name.replace('layout_', '');
                if (this._boxReset[attr] != null) {
                    if (offset == null) {
                        this._boxReset[attr] = 1;
                    }
                    else {
                        this._boxAdjustment[attr] += offset;
                        if (!negative) {
                            this._boxAdjustment[attr] = Math.max(0, this._boxAdjustment[attr]);
                        }
                    }
                }
            }
        }

        public valueBox(region: number) {
            const name = $util.convertEnum(region, $enum.BOX_STANDARD, BOX_ANDROID);
            if (name !== '') {
                const attr = name.replace('layout_', '');
                return [this._boxReset[attr] || 0, this._boxAdjustment[attr] || 0];
            }
            return [0, 0];
        }

        public supported(obj: string, attr: string, result = {}) {
            if (this.localSettings.targetAPI > 0 && this.localSettings.targetAPI < BUILD_ANDROID.LATEST) {
                const deprecated: ObjectMap<FunctionResult> = DEPRECATED_ANDROID[obj];
                if (deprecated && typeof deprecated[attr] === 'function') {
                    const valid = deprecated[attr](result, this.localSettings.targetAPI, this);
                    if (!valid || Object.keys(result).length > 0) {
                        return valid;
                    }
                }
                for (let i = this.localSettings.targetAPI; i <= BUILD_ANDROID.LATEST; i++) {
                    const version = API_ANDROID[i];
                    if (version && version[obj] && version[obj][attr] != null) {
                        const callback: boolean | FunctionResult = version[obj][attr];
                        if (typeof callback === 'boolean') {
                            return callback;
                        }
                        else if (typeof callback === 'function') {
                            return callback(result, this.localSettings.targetAPI, this);
                        }
                    }
                }
            }
            return true;
        }

        public combine(...objs: string[]) {
            const result: string[] = [];
            for (const value of this._namespaces.values()) {
                const obj: StringMap = this[`_${value}`];
                if (objs.length === 0 || objs.includes(value)) {
                    for (const attr in obj) {
                        if (value !== '_') {
                            result.push(`${value}:${attr}="${obj[attr]}"`);
                        }
                        else {
                            result.push(`${attr}="${obj[attr]}"`);
                        }
                    }
                }
            }
            return result.sort((a, b) => {
                if (a.startsWith('android:id=')) {
                    return -1;
                }
                else if (b.startsWith('android:id=')) {
                    return 1;
                }
                else {
                    return a > b ? 1 : -1;
                }
            });
        }

        public localizeString(value: string) {
            if (!this.hasBit('excludeProcedure', $enum.NODE_PROCEDURE.LOCALIZATION)) {
                return replaceRTL(value, this.localSettings);
            }
            return value;
        }

        public clone(id?: number, children = false): View {
            const node = new View(id || this.id, this.element);
            Object.assign(node.localSettings, this.localSettings);
            node.nodeId = this.nodeId;
            node.nodeType = this.nodeType;
            node.baseElement = this.baseElement;
            node.controlName = this.controlName;
            node.alignmentType = this.alignmentType;
            node.depth = this.depth;
            node.rendered = this.rendered;
            node.renderDepth = this.renderDepth;
            node.renderParent = this.renderParent;
            node.renderExtension = this.renderExtension;
            node.documentRoot = this.documentRoot;
            if (children) {
                node.replace(this.duplicate());
            }
            node.inherit(this, 'initial', 'base', 'style', 'styleMap');
            return node;
        }

        public setNodeType(controlName: string) {
            if (this.nodeType === 0) {
                for (const android in NODE_ANDROID) {
                    if (NODE_ANDROID[android] === controlName) {
                        for (const standard in $enum.NODE_STANDARD) {
                            if ($enum.NODE_STANDARD[$enum.NODE_STANDARD[standard]] === android) {
                                this.nodeType = <unknown> $enum.NODE_STANDARD[standard] as number;
                                break;
                            }
                        }
                        break;
                    }
                }
            }
            this.controlName = controlName;
            if (this.android('id') !== '') {
                this.nodeId = stripId(this.android('id'));
            }
            if (!this.nodeId) {
                const element = <HTMLInputElement> this.element;
                let name = $util.trimNull(element.id || element.name);
                if (RESERVED_JAVA.includes(name)) {
                    name = `_${name}`;
                }
                this.nodeId = $util.convertWord(generateId('android', name || $util.lastIndexOf(this.controlName, '.').toLowerCase(), name ? 0 : 1));
                this.android('id', this.stringId);
            }
        }

        public setLayout() {
            if (this.nodeType >= $enum.NODE_STANDARD.SCROLL_HORIZONTAL) {
                this.android('layout_width', this.nodeType === $enum.NODE_STANDARD.SCROLL_HORIZONTAL && this.has('width', $enum.CSS_STANDARD.UNIT) ? this.css('width') : 'wrap_content');
                this.android('layout_height', this.nodeType === $enum.NODE_STANDARD.SCROLL_VERTICAL && this.has('height', $enum.CSS_STANDARD.UNIT) ? this.css('height') : 'wrap_content');
            }
            else if (this.renderParent.nodeType >= $enum.NODE_STANDARD.SCROLL_HORIZONTAL) {
                if (this.renderParent.is($enum.NODE_STANDARD.SCROLL_HORIZONTAL)) {
                    this.android('layout_width', 'wrap_content', false);
                    this.android('layout_height', 'match_parent', false);
                }
                else {
                    this.android('layout_width', 'match_parent', false);
                    this.android('layout_height', 'wrap_content', false);
                }
            }
            else {
                const parent = this.documentParent;
                const renderParent = this.renderParent;
                const renderChildren = this.renderChildren;
                const width = (() => {
                    if (this.plainText) {
                        return this.bounds.width;
                    }
                    else if (this.linear && this.linear.width > 0) {
                        return this.linear.width;
                    }
                    else {
                        return this.styleElement ? this.element.clientWidth + this.borderLeftWidth + this.borderRightWidth + this.marginLeft + this.marginRight : 0;
                    }
                })();
                const height = (() => {
                    if (this.plainText) {
                        return this.bounds.height;
                    }
                    else if (this.linear && this.linear.height > 0) {
                        return this.linear.height;
                    }
                    else {
                        return this.styleElement ? this.element.clientHeight + this.borderTopWidth + this.borderBottomWidth + this.marginTop + this.marginBottom : 0;
                    }
                })();
                const widthParent = (() => {
                    if (parent.initial.box && parent.initial.box.width > 0) {
                        return parent.initial.box.width;
                    }
                    else if (parent.box && parent.box.width > 0) {
                        return parent.box.width;
                    }
                    else {
                        return parent.styleElement ? (<HTMLElement> parent.element).offsetWidth - (parent.paddingLeft + parent.paddingRight + parent.borderLeftWidth + parent.borderRightWidth) : 0;
                    }
                })();
                const heightParent = (() => {
                    if (parent.initial.box && parent.initial.box.height > 0) {
                        return parent.initial.box.height;
                    }
                    else if (parent.box && parent.box.height > 0) {
                        return parent.box.height;
                    }
                    else {
                        return parent.styleElement ? (<HTMLElement> parent.element).offsetHeight - (parent.paddingTop + parent.paddingBottom + parent.borderTopWidth + parent.borderBottomWidth) : 0;
                    }
                })();
                const styleMap = this.styleMap;
                const constraint = this.constraint;
                const tableElement = this.tagName === 'TABLE';
                if (this.documentBody || (this.documentRoot && !this.flex.enabled && this.is($enum.NODE_STANDARD.FRAME, $enum.NODE_STANDARD.CONSTRAINT, $enum.NODE_STANDARD.RELATIVE))) {
                    if (!this.hasWidth && this.block && !constraint.layoutHorizontal) {
                        this.android('layout_width', 'match_parent', false);
                    }
                    if (!this.hasHeight &&
                        this.cascade().some(node => !node.pageflow) &&
                        !constraint.layoutHeight &&
                        !constraint.layoutVertical)
                    {
                        this.android('layout_height', 'match_parent', false);
                    }
                }
                if (this.of($enum.NODE_STANDARD.GRID, $enum.NODE_ALIGNMENT.PERCENT)) {
                    this.android('layout_width', 'match_parent');
                }
                else {
                    if (this.android('layout_width') !== '0px') {
                        if (this.toInt('width') > 0 && (
                                !this.inlineStatic ||
                                renderParent.is($enum.NODE_STANDARD.GRID) ||
                                !this.has('width', 0, { map: 'initial' })
                           ))
                        {
                            if (this.has('width', $enum.CSS_STANDARD.PERCENT)) {
                                if (styleMap.width === '100%') {
                                    this.android('layout_width', 'match_parent', false);
                                }
                                else if (renderParent.of($enum.NODE_STANDARD.GRID, $enum.NODE_ALIGNMENT.PERCENT)) {
                                    this.android('layout_width', '0px');
                                    this.android('layout_columnWeight', (parseInt(styleMap.width) / 100).toFixed(2));
                                }
                                else {
                                    const widthPercent = Math.ceil(this.bounds.width) - (!tableElement ? this.paddingLeft + this.paddingRight + this.borderLeftWidth + this.borderRightWidth : 0);
                                    this.android('layout_width', $util.formatPX(widthPercent), false);
                                }
                            }
                            else {
                                this.android('layout_width', $util.convertInt(parent.android('layout_width')) > 0 && parent.viewWidth > 0 && this.viewWidth >= parent.viewWidth ? 'match_parent' : styleMap.width, renderParent.tagName !== 'TABLE');
                            }
                        }
                        if (constraint.layoutWidth) {
                            if (constraint.layoutHorizontal) {
                                this.android('layout_width', parent.hasWidth ? 'match_parent' : 'wrap_content', false);
                            }
                            else {
                                this.android('layout_width', this.bounds.width >= widthParent ? 'match_parent' : $util.formatPX(this.bounds.width), false);
                            }
                        }
                        if (this.has('minWidth', $enum.CSS_STANDARD.UNIT)) {
                            this.android('layout_width', 'wrap_content', false);
                            this.android('minWidth', styleMap.minWidth, false);
                        }
                        if (!this.documentBody && this.has('maxWidth', $enum.CSS_STANDARD.UNIT) && this.layoutVertical) {
                            const maxWidth = this.css('maxWidth');
                            renderChildren.forEach(node => node.is($enum.NODE_STANDARD.TEXT) && !node.has('maxWidth') && node.android('maxWidth', maxWidth));
                        }
                    }
                    if (this.android('layout_width') === '') {
                        const widthDefined = renderChildren.filter(node => !node.autoMargin && node.has('width', $enum.CSS_STANDARD.UNIT, { map: 'initial' }));
                        const gridParent = renderParent.is($enum.NODE_STANDARD.GRID);
                        const columnWeight = this.android('layout_columnWeight');
                        if (gridParent && columnWeight && columnWeight !== '0') {
                            this.android('layout_width', '0px');
                        }
                        else if ((widthDefined.length > 0 && widthDefined.some(node => node.bounds.width >= this.box.width)) || this.svgElement) {
                            this.android('layout_width', 'wrap_content');
                        }
                        else {
                            if (this.is($enum.NODE_STANDARD.GRID) &&
                                $util.withinFraction(
                                    this.box.right,
                                    Math.max.apply(null, renderChildren.filter(node => node.inlineElement || !node.blockStatic).map(node => node.linear.right))
                               ))
                            {
                                this.android('layout_width', 'wrap_content');
                            }
                            else if (
                                (this.blockStatic && this.hasAlign($enum.NODE_ALIGNMENT.VERTICAL)) ||
                                (!this.documentRoot && renderChildren.some(node => node.hasAlign($enum.NODE_ALIGNMENT.VERTICAL) && !node.has('width'))))
                            {
                                this.android('layout_width', 'match_parent');
                            }
                            else {
                                const wrap = (
                                    this.nodeType < $enum.NODE_STANDARD.INLINE ||
                                    this.inlineElement ||
                                    !this.pageflow ||
                                    !this.siblingflow ||
                                    this.display === 'table' ||
                                    parent.flex.enabled ||
                                    (renderParent.inlineElement && !renderParent.hasWidth && !this.inlineElement && this.nodeType > $enum.NODE_STANDARD.BLOCK) ||
                                    gridParent
                                );
                                if (!wrap || (this.blockStatic && !this.has('maxWidth'))) {
                                    const previousSibling = this.previousSibling();
                                    const nextSibling = this.nextSibling();
                                    if (width >= widthParent ||
                                        (this.linearVertical && !this.floating && !this.autoMargin) ||
                                        (this.is($enum.NODE_STANDARD.FRAME) && renderChildren.some(node => node.blockStatic && (node.autoMarginHorizontal || node.autoMarginLeft))) ||
                                        (!this.htmlElement && this.length > 0 && renderChildren.some(item => item.linear.width >= this.documentParent.box.width) && !renderChildren.some(item => item.plainText && item.multiLine)) ||
                                        (this.htmlElement && this.blockStatic && (
                                            this.documentParent.documentBody ||
                                            this.ascend().every(node => node.blockStatic) ||
                                            (this.documentParent.blockStatic && this.nodeType <= $enum.NODE_STANDARD.LINEAR && (!previousSibling || !previousSibling.floating) && (!nextSibling || !nextSibling.floating))
                                       )))
                                    {
                                        this.android('layout_width', 'match_parent');
                                    }
                                }
                            }
                            this.android('layout_width', 'wrap_content', false);
                        }
                    }
                }
                if (this.android('layout_height') !== '0px') {
                    if (this.toInt('height') > 0 && (!this.inlineStatic || !this.has('height', 0, { map: 'initial' }))) {
                        if (this.has('height', $enum.CSS_STANDARD.PERCENT)) {
                            if (styleMap.height === '100%') {
                                this.android('layout_height', 'match_parent', false);
                            }
                            else {
                                let heightPercent = this.bounds.height;
                                if (!tableElement) {
                                    heightPercent -= this.paddingTop + this.paddingBottom + this.borderTopWidth + this.borderBottomWidth;
                                }
                                this.android('layout_height', $util.formatPX(heightPercent), false);
                            }
                        }
                        else {
                            this.android('layout_height', this.css('overflow') === 'hidden' && this.toInt('height') < Math.floor(this.box.height) ? 'wrap_content' : styleMap.height);
                        }
                    }
                    if (constraint.layoutHeight) {
                        if (constraint.layoutVertical) {
                            this.android('layout_height', 'wrap_content', false);
                        }
                        else if (this.documentRoot) {
                            const bottomHeight: number = Math.max.apply(null, renderChildren.filter(node => node.pageflow).map(node => node.linear.bottom));
                            this.android('layout_height', bottomHeight > 0 ? $util.formatPX(bottomHeight + this.paddingBottom + this.borderBottomWidth) : 'match_parent', false);
                        }
                        else {
                            this.android('layout_height', this.actualHeight < heightParent ? $util.formatPX(this.actualHeight) : 'match_parent', false);
                        }
                    }
                    if (this.has('minHeight', $enum.CSS_STANDARD.UNIT)) {
                        this.android('layout_height', 'wrap_content', false);
                        this.android('minHeight', styleMap.minHeight, false);
                    }
                    if (!this.documentBody && this.has('maxHeight', $enum.CSS_STANDARD.UNIT) && this.layoutHorizontal) {
                        const maxHeight = this.css('maxHeight');
                        renderChildren.forEach(node => node.is($enum.NODE_STANDARD.TEXT) && !node.has('maxHeight') && node.android('maxHeight', maxHeight));
                    }
                }
                if (this.android('layout_height') === '') {
                    if (this.svgElement) {
                        this.android('layout_height', 'wrap_content');
                    }
                    else if (
                        height >= heightParent &&
                        parent.hasHeight &&
                        !(this.inlineElement && this.nodeType < $enum.NODE_STANDARD.INLINE) &&
                        !(renderParent.is($enum.NODE_STANDARD.RELATIVE) && renderParent.inlineHeight))
                    {
                        this.android('layout_height', 'match_parent');
                    }
                    else {
                        if (this.lineHeight > 0 && !this.plainText && !renderParent.linearHorizontal) {
                            const boundsHeight = this.actualHeight + renderParent.paddingTop + renderParent.paddingBottom;
                            if (this.inlineElement && boundsHeight > 0 && this.lineHeight >= boundsHeight) {
                                this.android('layout_height', $util.formatPX(boundsHeight));
                                this.modifyBox($enum.BOX_STANDARD.PADDING_TOP, null);
                                this.modifyBox($enum.BOX_STANDARD.PADDING_BOTTOM, null);
                            }
                            else if (this.block && this.box.height > 0 && $util.withinFraction(this.lineHeight, this.box.height)) {
                                this.android('layout_height', $util.formatPX(boundsHeight));
                            }
                        }
                        this.android('layout_height', 'wrap_content', false);
                    }
                }
            }
            switch (this.cssParent('visibility', true)) {
                case 'hidden':
                case 'collapse':
                    this.android('visibility', 'invisible');
                    break;
            }
        }

        public setAlignment() {
            function mergeGravity(original?: string, ...alignment: string[]) {
                const direction = [...$util.trimNull(original).split('|'), ...alignment].filter(value => value);
                switch (direction.length) {
                    case 0:
                        return '';
                    case 1:
                        return direction[0];
                    default:
                        let x = '';
                        let y = '';
                        let z = '';
                        for (let i = 0; i < direction.length; i++) {
                            const value = direction[i];
                            switch (value) {
                                case 'center':
                                    x = 'center_horizontal';
                                    y = 'center_vertical';
                                    break;
                                case 'left':
                                case 'start':
                                case 'right':
                                case 'end':
                                case 'center_horizontal':
                                    x = value;
                                    break;
                                case 'top':
                                case 'bottom':
                                case 'center_vertical':
                                    y = value;
                                    break;
                                default:
                                    z += (z !== '' ? '|' : '') + value;
                                    break;
                            }
                        }
                        const gravity = [x, y].filter(value => value);
                        const merged = gravity.filter(value => value.indexOf('center') !== -1).length === 2 ? 'center' : gravity.join('|');
                        return merged !== '' ? (z !== '' ? `${merged}|${z}` : merged) : z;
                }
            }
            function setAutoMargin(node: View) {
                if (!node.blockWidth) {
                    const alignment: string[] = [];
                    const marginLeft = node.css('marginLeft') === 'auto';
                    const marginRight = node.css('marginRight') === 'auto';
                    const marginTop = node.css('marginTop') === 'auto';
                    const marginBottom = node.css('marginBottom') === 'auto';
                    if (marginLeft && marginRight) {
                        alignment.push('center_horizontal');
                    }
                    else if (marginLeft && !marginRight) {
                        alignment.push(right);
                    }
                    else if (!marginLeft && marginRight) {
                        alignment.push(left);
                    }
                    if (marginTop && marginBottom) {
                        alignment.push('center_vertical');
                    }
                    else if (marginTop && !marginBottom) {
                        alignment.push('bottom');
                    }
                    else if (!marginTop && marginBottom) {
                        alignment.push('top');
                    }
                    if (alignment.length > 0) {
                        const gravity = node.blockWidth ? 'gravity' : 'layout_gravity';
                        node.android(gravity, mergeGravity(node.android(gravity), ...alignment));
                        return true;
                    }
                }
                return false;
            }
            function convertHorizontal(value: string) {
                switch (value) {
                    case 'left':
                    case 'start':
                        return left;
                    case 'right':
                    case 'end':
                        return right;
                    case 'center':
                        return 'center_horizontal';
                    default:
                        return '';
                }
            }
            function setTextAlign(value: string) {
                if (textAlign === '' || value === right) {
                    return value;
                }
                return textAlign;
            }
            const renderParent = this.renderParent;
            const textAlignParent = this.cssParent('textAlign');
            const left = this.localizeString('left');
            const right = this.localizeString('right');
            let textAlign = this.styleMap.textAlign || '';
            let verticalAlign = '';
            let floating = '';
            if (!(this.floating || renderParent.of($enum.NODE_STANDARD.RELATIVE, $enum.NODE_ALIGNMENT.MULTILINE))) {
                switch (this.styleMap.verticalAlign) {
                    case 'top':
                    case 'text-top':
                        verticalAlign = 'top';
                        if (renderParent.linearHorizontal && this.inlineHeight) {
                            this.android('layout_height', 'match_parent');
                        }
                        break;
                    case 'middle':
                        if (this.inline ||
                            this.documentParent.css('display') === 'table-cell' ||
                            (this.inlineStatic && this.documentParent.lineHeight > 0))
                        {
                            verticalAlign = 'center_vertical';
                        }
                        break;
                    case 'bottom':
                    case 'text-bottom':
                        verticalAlign = 'bottom';
                        break;
                }
            }
            if (verticalAlign === '' && this.lineHeight > 0 && !this.blockHeight) {
                verticalAlign = 'center_vertical';
            }
            if (renderParent.linearVertical || (this.documentRoot && this.linearVertical)) {
                if (this.float === 'right') {
                    this.android('layout_gravity', right);
                }
                else {
                    setAutoMargin(this);
                }
            }
            if (this.hasAlign($enum.NODE_ALIGNMENT.FLOAT)) {
                if (this.hasAlign($enum.NODE_ALIGNMENT.RIGHT) || this.renderChildren.some(node => node.hasAlign($enum.NODE_ALIGNMENT.RIGHT))) {
                    floating = right;
                }
                else if (this.hasAlign($enum.NODE_ALIGNMENT.LEFT) || this.renderChildren.some(node => node.hasAlign($enum.NODE_ALIGNMENT.LEFT))) {
                    floating = left;
                }
            }
            if (renderParent.tagName === 'TABLE') {
                this.android('layout_gravity', mergeGravity(this.android('layout_gravity'), 'fill'));
                if (textAlign === '' && this.tagName === 'TH') {
                    textAlign = 'center';
                }
                if (verticalAlign === '') {
                    verticalAlign = 'center_vertical';
                }
            }
            if (renderParent.is($enum.NODE_STANDARD.FRAME)) {
                if (!setAutoMargin(this)) {
                    floating = floating || this.float;
                    if (floating !== 'none') {
                        if (renderParent.inlineWidth || (this.singleChild && !renderParent.documentRoot)) {
                            renderParent.android('layout_gravity', mergeGravity(renderParent.android('layout_gravity'), this.localizeString(floating)));
                        }
                        else {
                            if (this.blockWidth) {
                                textAlign = setTextAlign(floating);
                            }
                            else {
                                this.android('layout_gravity', mergeGravity(this.android('layout_gravity'), this.localizeString(floating)));
                            }
                        }
                    }
                }
            }
            else if (floating !== '') {
                if (this.is($enum.NODE_STANDARD.LINEAR)) {
                    if (this.blockWidth) {
                        textAlign = setTextAlign(floating);
                    }
                    else {
                        this.android('layout_gravity', mergeGravity(this.android('layout_gravity'), floating));
                    }
                }
                else if (renderParent.hasAlign($enum.NODE_ALIGNMENT.VERTICAL)) {
                    textAlign = setTextAlign(floating);
                }
            }
            if (textAlignParent !== '' && this.localizeString(textAlignParent) !== left) {
                if (renderParent.is($enum.NODE_STANDARD.FRAME) &&
                    this.singleChild &&
                    !this.floating &&
                    !this.autoMargin)
                {
                    this.android('layout_gravity', mergeGravity(this.android('layout_gravity'), convertHorizontal(textAlignParent)));
                }
                if (textAlign === '') {
                    textAlign = textAlignParent;
                }
            }
            if (verticalAlign !== '' && renderParent.linearHorizontal) {
                this.android('layout_gravity', mergeGravity(this.android('layout_gravity'), verticalAlign));
                verticalAlign = '';
            }
            if (this.documentRoot && (this.blockWidth || this.is($enum.NODE_STANDARD.FRAME))) {
                this.delete('android', 'layout_gravity');
            }
            this.android('gravity', mergeGravity(this.android('gravity'), convertHorizontal(textAlign), verticalAlign));
        }

        public setBoxSpacing() {
            if (!this.hasBit('excludeResource', $enum.NODE_RESOURCE.BOX_SPACING)) {
                ['padding', 'margin'].forEach(region => {
                    ['Top', 'Left', 'Right', 'Bottom'].forEach(direction => {
                        const dimension = region + direction;
                        const value: number = (this._boxReset[dimension] === 0 ? this[dimension] : 0) + this._boxAdjustment[dimension];
                        if (value !== 0) {
                            this.android(
                                this.localizeString(BOX_ANDROID[`${region.toUpperCase()}_${direction.toUpperCase()}`]),
                                $util.formatPX(value)
                            );
                        }
                    });
                });
                if (this.supported('android', 'layout_marginHorizontal')) {
                    const localizeLeft = this.localizeString('Left');
                    const localizeRight = this.localizeString('Right');
                    ['layout_margin', 'padding'].forEach((value, index) => {
                        const top = $util.convertInt(this.android(`${value}Top`));
                        const right = $util.convertInt(this.android(value + localizeRight));
                        const bottom = $util.convertInt(this.android(`${value}Bottom`));
                        const left = $util.convertInt(this.android(value + localizeLeft));
                        if (top !== 0 && top === bottom && bottom === left && left === right) {
                            this.delete('android', `${value}*`);
                            this.android(value, $util.formatPX(top));
                        }
                        else {
                            if (!(this.renderParent.is($enum.NODE_STANDARD.GRID) && index === 0)) {
                                if (top !== 0 && top === bottom) {
                                    this.delete('android', `${value}Top`, `${value}Bottom`);
                                    this.android(`${value}Vertical`, $util.formatPX(top));
                                }
                                if (left !== 0 && left === right) {
                                    this.delete('android', value + localizeLeft, value + localizeRight);
                                    this.android(`${value}Horizontal`, $util.formatPX(left));
                                }
                            }
                        }
                    });
                }
            }
        }

        public applyOptimizations() {
            this.setBlockSpacing();
            this.bindWhiteSpace();
            this.autoSizeBoxModel();
            this.alignLinearLayout();
            this.alignRelativePosition();
        }

        public applyCustomizations() {
            for (const build of [API_ANDROID[0], API_ANDROID[this.localSettings.targetAPI]]) {
                if (build && build.customizations) {
                    for (const nodeName of [this.tagName, this.controlName]) {
                        const customizations = build.customizations[nodeName];
                        if (customizations) {
                            for (const obj in customizations) {
                                for (const attr in customizations[obj]) {
                                    this.attr(obj, attr, customizations[obj][attr], this.localSettings.customizationsOverwritePrivilege);
                                }
                            }
                        }
                    }
                }
            }
        }

        private setBlockSpacing() {
            if (this.pageflow) {
                const renderParent = this.renderParent;
                if (this.documentParent === renderParent && !renderParent.documentBody && renderParent.blockStatic) {
                    const elements = renderParent.map(item => item.baseElement);
                    [[$dom.getFirstElementChild(elements), 'Top', $enum.BOX_STANDARD.MARGIN_TOP, $enum.BOX_STANDARD.PADDING_TOP],
                     [$dom.getLastElementChild(elements), 'Bottom', $enum.BOX_STANDARD.MARGIN_BOTTOM, $enum.BOX_STANDARD.PADDING_BOTTOM]]
                        .forEach((item: [HTMLElement, string, number, number], index: number) => {
                            const node = $dom.getNodeFromElement<View>(item[0]);
                            if (node && !node.lineBreak && (
                                    node === this ||
                                    node === this.renderChildren[index === 0 ? 0 : this.renderChildren.length - 1]
                            ))
                            {
                                const marginOffset = renderParent[`margin${item[1]}`];
                                if (marginOffset > 0 && renderParent[`padding${item[1]}`] === 0 && renderParent[`border${item[1]}Width`] === 0) {
                                    node.modifyBox(item[2], null);
                                }
                            }
                        });
                }
                if (this.htmlElement && this.blockStatic) {
                    for (let i = 0; i < this.element.children.length; i++) {
                        const element = this.element.children[i];
                        const node = $dom.getNodeFromElement<View>(element);
                        if (node && node.pageflow && node.blockStatic && !node.lineBreak) {
                            const previous = node.previousSibling();
                            if (previous && previous.pageflow && !previous.lineBreak) {
                                const marginTop = $util.convertInt(node.cssInitial('marginTop', true));
                                const marginBottom = $util.convertInt(previous.cssInitial('marginBottom', true));
                                if (marginBottom > 0 && marginTop > 0) {
                                    if (marginTop <= marginBottom) {
                                        node.modifyBox($enum.BOX_STANDARD.MARGIN_TOP, null);
                                    }
                                    else {
                                        previous.modifyBox($enum.BOX_STANDARD.MARGIN_BOTTOM, null);
                                    }
                                }
                            }
                            [element.previousElementSibling, element.nextElementSibling].forEach((item, index) => {
                                const adjacent = $dom.getNodeFromElement<View>(item);
                                if (adjacent && adjacent.excluded) {
                                    const offset = Math.min(adjacent.marginTop, adjacent.marginBottom);
                                    if (offset < 0) {
                                        if (index === 0) {
                                            node.modifyBox($enum.BOX_STANDARD.MARGIN_TOP, offset, true);
                                        }
                                        else {
                                            node.modifyBox($enum.BOX_STANDARD.MARGIN_BOTTOM, offset, true);
                                        }
                                    }
                                }
                            });
                        }
                    }
                }
            }
        }

        private autoSizeBoxModel() {
            if (this.localSettings.autoSizePaddingAndBorderWidth && !this.hasBit('excludeProcedure', $enum.NODE_PROCEDURE.AUTOFIT)) {
                const renderParent = this.renderParent;
                let layoutWidth = $util.convertInt(this.android('layout_width'));
                let layoutHeight = $util.convertInt(this.android('layout_height'));
                let borderWidth = false;
                if (this.imageElement) {
                    const top = this.borderTopWidth;
                    const right = this.borderRightWidth;
                    const bottom = this.borderBottomWidth;
                    const left = this.borderLeftWidth;
                    let width = 0;
                    let height = 0;
                    if (top > 0) {
                        this.modifyBox($enum.BOX_STANDARD.PADDING_TOP, top);
                        height += top;
                    }
                    if (right > 0) {
                        this.modifyBox($enum.BOX_STANDARD.PADDING_RIGHT, right);
                        width += right;
                    }
                    if (bottom > 0) {
                        this.modifyBox($enum.BOX_STANDARD.PADDING_BOTTOM, bottom);
                        height += bottom;
                    }
                    if (left > 0) {
                        this.modifyBox($enum.BOX_STANDARD.PADDING_LEFT, left);
                        width += left;
                    }
                    height += this.paddingTop + this.paddingBottom;
                    width += this.paddingLeft + this.paddingRight;
                    if (width > 0) {
                        if (layoutWidth > 0) {
                            this.android('layout_width', $util.formatPX(layoutWidth + width));
                        }
                        else {
                            layoutWidth = $util.convertInt(renderParent.android('layout_width'));
                            if (layoutWidth > 0 && this.singleChild) {
                                renderParent.android('layout_width', $util.formatPX(layoutWidth + this.marginLeft + width));
                            }
                        }
                    }
                    if (height > 0) {
                        if (layoutHeight > 0) {
                            this.android('layout_height', $util.formatPX(layoutHeight + height));
                        }
                        else {
                            layoutHeight = $util.convertInt(renderParent.android('layout_height'));
                            if (layoutHeight > 0 && this.singleChild) {
                                renderParent.android('layout_height', $util.formatPX(layoutHeight + this.marginTop + height));
                            }
                        }
                    }
                }
                else if (this.is($enum.NODE_STANDARD.BUTTON) && layoutHeight === 0) {
                    if (!this.has('minHeight')) {
                        this.android('layout_height', $util.formatPX(this.bounds.height + (this.css('borderStyle') === 'outset' ? $util.convertInt(this.css('borderWidth')) : 0)));
                    }
                }
                else if (this.is($enum.NODE_STANDARD.LINE)) {
                    if (layoutHeight > 0 && this.has('height', 0, { map: 'initial' }) && this.tagName !== 'HR') {
                        this.android('layout_height', $util.formatPX(layoutHeight + this.borderTopWidth + this.borderBottomWidth));
                    }
                }
                else if (this.tagName === 'TABLE') {
                    const width = $util.convertInt(this.android('layout_width'));
                    if (width > 0) {
                        if (this.bounds.width > width) {
                            this.android('layout_width', $util.formatPX(this.bounds.width));
                        }
                        if (this.has('width', $enum.CSS_STANDARD.AUTO, { map: 'initial' }) && this.renderChildren.every(node => node.inlineWidth)) {
                            for (const node of this.renderChildren) {
                                node.android('layout_width', '0px');
                                node.android('layout_columnWeight', '1');
                            }
                        }
                    }
                    borderWidth = this.css('boxSizing') === 'content-box' || $dom.isUserAgent($enum.USER_AGENT.EDGE | $enum.USER_AGENT.FIREFOX);
                }
                else {
                    if (this.styleElement && !this.hasBit('excludeResource', $enum.NODE_RESOURCE.BOX_SPACING)) {
                        if (!(renderParent.tagName === 'TABLE' || this.css('boxSizing') === 'border-box')) {
                            const minWidth = $util.convertInt(this.android('minWidth'));
                            const minHeight = $util.convertInt(this.android('minHeight'));
                            const paddedWidth = this.paddingLeft + this.paddingRight + this.borderLeftWidth + this.borderRightWidth;
                            const paddedHeight = View.getPaddedHeight(this);
                            if (layoutWidth > 0 && paddedWidth > 0 && this.toInt('width', 0, { map: 'initial' }) > 0) {
                                this.android('layout_width', $util.formatPX(layoutWidth + paddedWidth));
                            }
                            if (layoutHeight > 0 &&
                                paddedHeight > 0 &&
                                this.toInt('height', 0, { map: 'initial' }) > 0 && (
                                    this.lineHeight === 0 ||
                                    this.lineHeight < this.box.height ||
                                    this.lineHeight === this.toInt('height')
                               ))
                            {
                                this.android('layout_height', $util.formatPX(layoutHeight + paddedHeight));
                            }
                            if (minWidth > 0 && paddedWidth > 0) {
                                this.android('minWidth', $util.formatPX(minWidth + paddedWidth));
                            }
                            if (minHeight > 0 && paddedHeight > 0) {
                                this.android('minHeight', $util.formatPX(minHeight + paddedHeight));
                            }
                        }
                        borderWidth = true;
                    }
                }
                if (borderWidth) {
                    this.modifyBox($enum.BOX_STANDARD.PADDING_TOP, this.borderTopWidth);
                    this.modifyBox($enum.BOX_STANDARD.PADDING_RIGHT, this.borderRightWidth);
                    this.modifyBox($enum.BOX_STANDARD.PADDING_BOTTOM, this.borderBottomWidth);
                    this.modifyBox($enum.BOX_STANDARD.PADDING_LEFT, this.borderLeftWidth);
                }
            }
        }

        private bindWhiteSpace() {
            if (!this.hasAlign($enum.NODE_ALIGNMENT.FLOAT) && (
                    this.linearHorizontal ||
                    this.of($enum.NODE_STANDARD.RELATIVE, $enum.NODE_ALIGNMENT.HORIZONTAL, $enum.NODE_ALIGNMENT.MULTILINE) ||
                    this.of($enum.NODE_STANDARD.CONSTRAINT, $enum.NODE_ALIGNMENT.HORIZONTAL)
               ))
            {
                const textAlign = this.css('textAlign');
                const textIndent = this.toInt('textIndent');
                const valueBox = this.valueBox($enum.BOX_STANDARD.PADDING_LEFT);
                const relative = this.is($enum.NODE_STANDARD.RELATIVE);
                let right = this.box.left + (textIndent > 0 ? this.toInt('textIndent') : (textIndent < 0 && valueBox[0] === 1 ? valueBox[0] : 0));
                this.each((node: View, index: number) => {
                    if (!(node.floating ||
                        (relative && node.alignParent('left')) ||
                        (index === 0 && (textAlign !== 'left' || node.plainText)) ||
                        ['SUP', 'SUB'].includes(node.tagName)))
                    {
                        const width = Math.round(node.actualLeft() - right);
                        if (width >= 1) {
                            node.modifyBox($enum.BOX_STANDARD.MARGIN_LEFT, width);
                        }
                    }
                    right = node.actualRight();
                }, true);
            }
            else if (this.linearVertical) {
                function getPreviousBottom(list: View[]) {
                    return list.sort((a, b) => a.linear.bottom < b.linear.bottom ? 1 : -1)[0].linear.bottom;
                }
                const children = this.initial.children.some(node => $util.hasValue(node.dataset.include)) ? this.initial.children as View[] : this.renderChildren;
                children.forEach((node: View) => {
                    const previous = (() => {
                        let current: View | undefined = node;
                        do {
                            current = current.previousSibling(true, false, false) as View;
                        }
                        while (current && !this.initial.children.includes(current));
                        return current;
                    })();
                    const elements = $dom.getElementsBetweenSiblings(
                        previous
                            ? (previous.length > 0 && !previous.styleElement ? $dom.getLastElementChild(previous.map(item => item.baseElement)) : previous.baseElement)
                            : undefined,
                        node.baseElement
                    )
                    .filter(element => {
                        const item = $dom.getNodeFromElement<View>(element);
                        return item && (item.lineBreak || (item.excluded && item.blockStatic));
                    });
                    if (elements.length > 0) {
                        let bottom: number;
                        if (!previous) {
                            bottom = this.box.top;
                        }
                        else {
                            bottom = (() => {
                                if (previous.renderParent.of($enum.NODE_STANDARD.FRAME, $enum.NODE_ALIGNMENT.FLOAT)) {
                                    return getPreviousBottom(previous.renderParent.renderChildren.slice());
                                }
                                else if (previous.layoutHorizontal && previous.length > 0 && !previous.styleElement && previous.renderChildren.some(item => !item.floating)) {
                                    return getPreviousBottom(previous.renderChildren.filter(item => !item.floating));
                                }
                                return previous.linear.bottom;
                            })();
                        }
                        if (elements.length === 1 && elements[0].tagName === 'BR' && previous && previous.inline && node.inline) {
                            return;
                        }
                        const height = Math.round(node.linear.top - bottom);
                        if (height >= 1) {
                            node.modifyBox($enum.BOX_STANDARD.MARGIN_TOP, height);
                        }
                    }
                });
            }
        }

        private alignLinearLayout() {
            if (this.linearHorizontal) {
                const renderParent = this.renderParent;
                const renderChildren = this.renderChildren;
                const pageflow = renderChildren.filter(node => !node.floating && (node.styleElement || node.renderChildren.length === 0));
                if (pageflow.length > 0 &&
                    pageflow.every(node => node.baseline || node.has('verticalAlign', $enum.CSS_STANDARD.UNIT)) && (
                        (pageflow.some(node => node.toInt('verticalAlign') < 0) && pageflow.some(node => node.toInt('verticalAlign') > 0)) ||
                        pageflow.some(node => node.imageElement && node.toInt('verticalAlign') !== 0)
                   ))
                {
                    const tallest: View[] = [];
                    const marginTop: number = Math.max.apply(null, pageflow.map(node => node.toInt('verticalAlign')));
                    let offsetTop = 0;
                    if (marginTop > 0) {
                        pageflow.forEach(node => {
                            const offset = node.toInt('verticalAlign');
                            const offsetHeight = (node.imageElement ? node.bounds.height : 0) + (offset > 0 ? offset : 0);
                            if (offsetHeight >= offsetTop) {
                                if (offsetHeight > offsetTop) {
                                    tallest.length = 0;
                                }
                                tallest.push(node);
                                offsetTop = offsetHeight;
                            }
                        });
                        tallest.sort(a => a.imageElement ? -1 : 1);
                        pageflow.forEach(node => {
                            if (!tallest.includes(node)) {
                                const offset = node.toInt('verticalAlign');
                                if (marginTop > 0) {
                                    let offsetHeight = 0;
                                    if (tallest[0].imageElement) {
                                        if ($dom.isUserAgent($enum.USER_AGENT.EDGE) && node.plainText) {
                                            offsetHeight = node.bounds.height - offsetTop;
                                        }
                                        else {
                                            offsetHeight = node.bounds.height;
                                        }
                                    }
                                    node.modifyBox($enum.BOX_STANDARD.MARGIN_TOP, offsetTop - offsetHeight);
                                }
                                if (offset !== 0) {
                                    node.modifyBox($enum.BOX_STANDARD.MARGIN_TOP, offset * -1, true);
                                    node.css('verticalAlign', '0px');
                                }
                            }
                        });
                        tallest.forEach(node => node.css('verticalAlign', '0px'));
                    }
                }
                if (renderChildren.some(node => node.tagName === 'SUB') && this.inlineHeight) {
                    const offsetHeight = $util.convertInt(View.getCustomizationValue(this.localSettings.targetAPI, 'SUB', 'android', 'layout_marginTop'));
                    if (offsetHeight > 0) {
                        this.android('layout_height', $util.formatPX(this.bounds.height + offsetHeight + View.getPaddedHeight(this)));
                    }
                }
                if (!renderChildren.some(node => node.imageElement && node.baseline) &&
                    (this.hasAlign($enum.NODE_ALIGNMENT.FLOAT) || renderChildren.some(node => node.floating || !node.siblingflow)))
                {
                    this.android('baselineAligned', 'false');
                }
                else {
                    const childIndex = renderParent.android('baselineAlignedChildIndex');
                    if (renderParent.renderChildren.some(node => node.baseline && node.textElement) ||
                        (childIndex !== '' && renderParent.renderChildren.findIndex(node => node === this) === parseInt(childIndex)) ||
                        renderChildren.some(node => !node.alignOrigin || !node.baseline) ||
                        (renderChildren.some(node => node.nodeType < $enum.NODE_STANDARD.TEXT) && renderChildren.some(node => node.textElement && node.baseline)) ||
                        (renderParent.is($enum.NODE_STANDARD.GRID) && !renderChildren.some(node => node.textElement && node.baseline)))
                    {
                        const baseline = NodeList.textBaseline(renderChildren);
                        if (baseline.length > 0) {
                            this.android('baselineAlignedChildIndex', renderChildren.indexOf(baseline[0]).toString());
                        }
                    }
                }
                if (this.localSettings.ellipsisOnTextOverflow && this.length > 1 && renderChildren.every(node => node.textElement && !node.floating)) {
                    const node = renderChildren[renderChildren.length - 1];
                    if (node.textElement && !node.multiLine && node.textContent.trim().split(String.fromCharCode(32)).length > 1) {
                        node.android('singleLine', 'true');
                    }
                }
            }
        }

        private alignRelativePosition() {
            const renderParent = this.renderParent;
            if ((this.inline || (this.imageOrSvgElement && this.display === 'inline-block') && !this.floating)) {
                const offset = this.toInt('verticalAlign');
                if (offset !== 0) {
                    this.modifyBox($enum.BOX_STANDARD.MARGIN_TOP, offset * -1, true);
                    if (offset < 0 &&
                        this.display !== 'inline-block' &&
                        renderParent.layoutHorizontal &&
                        renderParent.inlineHeight)
                    {
                        renderParent.android('layout_height', $util.formatPX(renderParent.bounds.height + View.getPaddedHeight(renderParent)));
                    }
                }
            }
            if (this.position === 'relative' || renderParent.is($enum.NODE_STANDARD.FRAME)) {
                const top = this.toInt('top');
                const bottom = this.toInt('bottom');
                const left = this.toInt('left');
                if (top !== 0) {
                    if (top < 0 &&
                        this.floating &&
                        !!this.data('RESOURCE', 'backgroundImage') &&
                        renderParent.is($enum.NODE_STANDARD.RELATIVE, $enum.NODE_STANDARD.LINEAR))
                    {
                        let found = false;
                        renderParent.renderChildren.some((node: View) => {
                            if (node === this) {
                                found = true;
                            }
                            else {
                                if (node.android('layout_below') !== '') {
                                    return true;
                                }
                                else if (found) {
                                    node.modifyBox($enum.BOX_STANDARD.MARGIN_TOP, Math.abs(top));
                                }
                            }
                            return false;
                        });
                    }
                    else {
                        this.modifyBox($enum.BOX_STANDARD.MARGIN_TOP, top, true);
                    }
                }
                else if (bottom !== 0) {
                    this.modifyBox($enum.BOX_STANDARD.MARGIN_TOP, bottom * -1, true);
                }
                if (left !== 0) {
                    if (this.float === 'right' || (this.position === 'relative' && this.autoMarginLeft)) {
                        this.modifyBox($enum.BOX_STANDARD.MARGIN_RIGHT, left * -1, true);
                    }
                    else {
                        this.modifyBox($enum.BOX_STANDARD.MARGIN_LEFT, left, true);
                    }
                }
            }
            if (!this.plainText && !renderParent.linearHorizontal) {
                const offset = (this.lineHeight + this.toInt('verticalAlign')) - this.actualHeight;
                if (offset > 0) {
                    this.modifyBox($enum.BOX_STANDARD.MARGIN_TOP, Math.floor(offset / 2));
                    this.modifyBox($enum.BOX_STANDARD.MARGIN_BOTTOM, Math.ceil(offset / 2));
                }
            }
        }

        get stringId() {
            return this.nodeId ? `@+id/${this.nodeId}` : '';
        }

        set controlName(value: string) {
            this._controlName = value;
        }
        get controlName() {
            if (this._controlName) {
                return this._controlName;
            }
            else {
                const value: number = $const.MAP_ELEMENT[this.nodeName];
                if (value != null) {
                    this.nodeType = value;
                    return View.getControlName(value);
                }
                return '';
            }
        }

        set documentParent(value: View) {
            this._documentParent = value;
        }
        get documentParent() {
            if (this._documentParent) {
                return this._documentParent;
            }
            else if (this.id === 0) {
                return this;
            }
            else {
                return this.getParentElementAsNode(false) as View || View.documentBody();
            }
        }

        set renderParent(value: View) {
            if (value !== this) {
                value.appendRendered(this);
            }
            this._renderParent = value;
        }
        get renderParent() {
            return this._renderParent as View || View.documentBody();
        }

        get anchored() {
            return this.constraint.horizontal && this.constraint.vertical;
        }

        get layoutHorizontal() {
            return (
                this.linearHorizontal ||
                this.hasAlign($enum.NODE_ALIGNMENT.HORIZONTAL) ||
                (this.nodes.filter(node => node.pageflow).length > 1 && (
                    NodeList.linearX(this.nodes) ||
                    (this.is($enum.NODE_STANDARD.FRAME) && this.nodes.every(node => node.domElement)))
                )
            );
        }
        get layoutVertical() {
            return (
                this.linearVertical ||
                this.hasAlign($enum.NODE_ALIGNMENT.VERTICAL) ||
                (this.nodes.filter(node => node.pageflow).length > 1 && (
                    NodeList.linearY(this.nodes)) ||
                    (this.is($enum.NODE_STANDARD.FRAME) && this.nodes.some(node => node.linearVertical))
                )
            );
        }

        get linearHorizontal() {
            return this._android.orientation === AXIS_ANDROID.HORIZONTAL && this.is($enum.NODE_STANDARD.LINEAR, $enum.NODE_STANDARD.RADIO_GROUP);
        }
        get linearVertical() {
            return this._android.orientation === AXIS_ANDROID.VERTICAL && this.is($enum.NODE_STANDARD.LINEAR, $enum.NODE_STANDARD.RADIO_GROUP);
        }

        get inlineWidth() {
            return this._android.layout_width === 'wrap_content';
        }
        get inlineHeight() {
            return this._android.layout_height === 'wrap_content';
        }

        get blockWidth() {
            return this._android.layout_width === 'match_parent';
        }
        get blockHeight() {
            return this._android.layout_height === 'match_parent';
        }

        set localSettings(value) {
            Object.assign(this._localSettings, value);
        }
        get localSettings() {
            return this._localSettings;
        }
    };
};