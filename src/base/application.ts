import { REGEX_PATTERN } from '../lib/constant';
import { APP_SECTION, BOX_STANDARD, NODE_ALIGNMENT, NODE_CONTAINER, NODE_PROCEDURE, NODE_RESOURCE, USER_AGENT, CSS_STANDARD } from '../lib/enumeration';

import Controller from './controller';
import Extension from './extension';
import Node from './node';
import NodeList from './nodelist';
import Resource from './resource';

import { cssParent, cssResolveUrl, deleteElementCache, getElementCache, getBetweenElements, getStyle, hasFreeFormText, isElementVisible, isPlainText, isStyleElement, isUserAgent, setElementCache } from '../lib/dom';
import { convertCamelCase, convertPX, convertWord, hasBit, hasValue, isNumber, isPercent, isString, isUnit, resolvePath, sortAsc, trimNull, trimString } from '../lib/util';
import { formatPlaceholder, replaceIndent, replacePlaceholder } from '../lib/xml';

function prioritizeExtensions<T extends Node>(documentRoot: HTMLElement, element: HTMLElement, extensions: Extension<T>[]) {
    const tagged: string[] = [];
    let current: HTMLElement | null = element;
    do {
        if (current.dataset.ext) {
            tagged.push(...current.dataset.ext.split(',').map(value => value.trim()));
        }
        current = current !== documentRoot ? current.parentElement : null;
    }
    while (current);
    if (tagged.length) {
        const result: Extension<T>[] = [];
        const untagged: Extension<T>[] = [];
        for (const item of extensions) {
            const index = tagged.indexOf(item.name);
            if (index !== -1) {
                result[index] = item;
            }
            else {
                untagged.push(item);
            }
        }
        return [...result.filter(item => item), ...untagged];
    }
    else {
        return extensions;
    }
}

export default class Application<T extends Node> implements androme.lib.base.Application<T> {
    public static createLayoutData<T extends Node>(node: T, parent: T, containerType = 0, alignmentType = 0, itemCount = 0, items?: T[]): LayoutData<T> {
        return {
            node,
            parent,
            containerType,
            alignmentType,
            itemCount,
            items
        };
    }

    public static constraintFloat<T extends Node>(nodes: T[], floated: Set<string>, linearX?: boolean) {
        if (floated === undefined) {
            floated = NodeList.floated(nodes);
        }
        if (linearX === undefined) {
            linearX = NodeList.linearX(nodes);
        }
        return floated.size === 1 && nodes.every(node => node.floating) && (!linearX || nodes.some(node => node.has('width', CSS_STANDARD.PERCENT)));
    }

    public static frameHorizontal<T extends Node>(nodes: T[], floated: Set<string>, cleared: Map<T, string>, lineBreak = false) {
        const margin = nodes.filter(node => node.autoMargin);
        const br = lineBreak ? getBetweenElements(nodes[0].element, nodes[nodes.length - 1].element).filter(element => element.tagName === 'BR').length : 0;
        return (
            br === 0 && (
                floated.has('right') ||
                cleared.size > 0 ||
                margin.length ||
                !NodeList.linearX(nodes)
            )
        );
    }

    public static relativeHorizontal<T extends Node>(nodes: T[], cleared?: Map<T, string>) {
        const visible = nodes.filter(node => node.visible);
        const floated = NodeList.floated(nodes);
        const [floating, pageflow] = new NodeList(nodes).partition(node => node.floating);
        const flowIndex = pageflow.length ? Math.min.apply(null, pageflow.map(node => node.siblingIndex)) : Number.MAX_VALUE;
        const floatIndex = floating.length ? Math.max.apply(null, floating.map(node => node.siblingIndex)) : -1;
        const linearX = NodeList.linearX(nodes);
        if (visible.some(node => node.autoMarginHorizontal)) {
            return false;
        }
        if (floated.size === 1 && floating.length === nodes.length) {
            return !(linearX && (cleared === undefined || cleared.size === 0));
        }
        return (
            (cleared === undefined || cleared.size === 0) &&
            !floated.has('right') &&
            (pageflow.length === 0 || floating.length === 0 || floatIndex < flowIndex) &&
            visible.every(node => {
                const verticalAlign = node.css('verticalAlign');
                return (
                    node.toInt('top') >= 0 && (
                        ['baseline', 'initial', 'unset', 'top', 'middle', 'sub', 'super'].includes(verticalAlign) ||
                        (isUnit(verticalAlign) && parseInt(verticalAlign) >= 0)
                    )
                );
            }) && (
                visible.some(node => (node.baseline && (node.textElement || node.imageElement || node.svgElement)) || (node.plainText && node.multiLine)) ||
                (!linearX && nodes.every(node => node.pageflow && node.inlineElement))
            )
        );
    }

    public viewController: Controller<T>;
    public resourceHandler: Resource<T>;
    public nodeObject: Constructor<T>;
    public loading = false;
    public closed = false;
    public readonly builtInExtensions: ObjectMap<Extension<T>> = {};
    public readonly extensions = new Set<Extension<T>>();
    public readonly session: AppSession<NodeList<T>> = {
        cache: new NodeList<T>(),
        image: new Map<string, ImageAsset>(),
        renderQueue: new Map<string, string[]>()
    };
    public readonly processing: AppProcessing<T, NodeList<T>> = {
        cache: new NodeList<T>(),
        depthMap: new Map<string, Map<number, string>>(),
        node: null,
        layout: null
    };
    public readonly parseElements = new Set<HTMLElement>();

    private _settings: Settings;
    private _cacheRoot = new Set<Element>();
    private _renderPosition: ObjectMap<number[]> = {};
    private readonly _views: FileAsset[] = [];
    private readonly _includes: FileAsset[] = [];

    constructor(public readonly framework: number) {
    }

    public registerController(controller: Controller<T>) {
        controller.application = this;
        controller.cache = this.processing.cache;
        this.viewController = controller;
    }

    public registerResource(resource: Resource<T>) {
        resource.application = this;
        resource.cache = this.processing.cache;
        this.resourceHandler = resource;
    }

    public installExtension(ext: Extension<T>) {
        const found = this.getExtension(ext.name);
        if (found) {
            if (Array.isArray(ext.tagNames)) {
                found.tagNames = ext.tagNames;
            }
            Object.assign(found.options, ext.options);
            return true;
        }
        else {
            if ((ext.framework === 0 || hasBit(ext.framework, this.framework)) && ext.dependencies.every(item => !!this.getExtension(item.name))) {
                ext.application = this;
                this.extensions.add(ext);
                return true;
            }
        }
        return false;
    }

    public removeExtension(ext: Extension<T>) {
        return this.extensions.delete(ext);
    }

    public finalize() {
        this.processRenderQueue();
        const nodes = this.session.cache.filter(node => node.visible && node.rendered && !node.hasAlign(NODE_ALIGNMENT.SPACE));
        for (const node of nodes) {
            if (!node.hasBit('excludeProcedure', NODE_PROCEDURE.LAYOUT)) {
                node.setLayout();
            }
            if (!node.hasBit('excludeProcedure', NODE_PROCEDURE.ALIGNMENT)) {
                node.setAlignment();
            }
        }
        for (const node of nodes) {
            if (!node.hasBit('excludeProcedure', NODE_PROCEDURE.OPTIMIZATION)) {
                node.applyOptimizations();
            }
            if (!node.hasBit('excludeProcedure', NODE_PROCEDURE.CUSTOMIZATION)) {
                node.applyCustomizations();
            }
        }
        for (const ext of this.extensions) {
            for (const node of ext.subscribers) {
                ext.postProcedure(node);
            }
        }
        for (const ext of this.extensions) {
            ext.afterProcedure();
        }
        this.resourceHandler.finalize(this.viewData);
        this.viewController.finalize(this.viewData);
        for (const ext of this.extensions) {
            ext.afterFinalize();
        }
        this.closed = true;
    }

    public saveAllToDisk() {
        this.resourceHandler.fileHandler.saveAllToDisk(this.viewData);
    }

    public reset() {
        this.session.cache.each(node => node.domElement && deleteElementCache(node.element, 'node', 'style', 'styleMap', 'inlineSupport'));
        for (const element of this._cacheRoot as Set<HTMLElement>) {
            delete element.dataset.iteration;
            delete element.dataset.layoutName;
        }
        this.appName = '';
        this.session.renderQueue.clear();
        this.session.image.clear();
        this.session.cache.reset();
        this.processing.cache.reset();
        this.viewController.reset();
        this.resourceHandler.reset();
        this._cacheRoot.clear();
        this._views.length = 0;
        this._includes.length = 0;
        this._renderPosition = {};
        for (const ext of this.extensions) {
            ext.subscribers.clear();
            ext.subscribersChild.clear();
        }
        this.closed = false;
    }

    public parseDocument(...elements: any[]): FunctionMap<void> {
        let __THEN: () => void;
        this.parseElements.clear();
        this.loading = false;
        this.setStyleMap();
        if (this.appName === '' && elements.length === 0) {
            elements.push(document.body);
        }
        for (const item of elements) {
            const element = typeof item === 'string' ? document.getElementById(item) : item;
            if (element && isStyleElement(element)) {
                this.parseElements.add(element);
            }
        }
        const documentRoot = this.parseElements.values().next().value;
        const parseResume = () => {
            this.loading = false;
            if (this.settings.preloadImages) {
                Array.from(documentRoot.getElementsByClassName('androme.preload')).forEach(element => documentRoot.removeChild(element));
            }
            for (const [uri, image] of this.session.image.entries()) {
                Resource.ASSETS.images.set(uri, image);
            }
            for (const ext of this.extensions) {
                ext.beforeParseDocument();
            }
            for (const element of this.parseElements as Set<HTMLElement>) {
                if (this.appName === '') {
                    this.appName = element.id || 'untitled';
                }
                let filename = trimNull(element.dataset.filename).replace(new RegExp(`\.${this.viewController.localSettings.layout.fileExtension}$`), '');
                if (filename === '') {
                    filename = element.id || `document_${this.size}`;
                }
                const iteration = parseInt(element.dataset.iteration || '0') + 1;
                element.dataset.iteration = iteration.toString();
                element.dataset.layoutName = convertWord(iteration > 1 ? `${filename}_${iteration}` : filename);
                if (this.createCache(element)) {
                    this.setBaseLayout();
                    this.setConstraints();
                    this.setResources();
                    this._cacheRoot.add(element);
                }
            }
            for (const ext of this.extensions) {
                for (const node of ext.subscribers) {
                    ext.postParseDocument(node);
                }
            }
            for (const ext of this.extensions) {
                ext.afterParseDocument();
            }
            if (typeof __THEN === 'function') {
                __THEN.call(this);
            }
        };
        if (this.settings.preloadImages) {
            Array.from(this.parseElements).forEach(element => {
                element.querySelectorAll('svg image').forEach((image: SVGImageElement) => {
                    if (image.href) {
                        const uri = resolvePath(image.href.baseVal);
                        if (uri) {
                            this.session.image.set(uri, {
                                width: image.width.baseVal.value,
                                height: image.height.baseVal.value,
                                uri
                            });
                        }
                    }
                });
            });
            for (const image of this.session.image.values()) {
                if (image.width === 0 && image.height === 0 && image.uri) {
                    const imageElement = <HTMLImageElement> document.createElement('IMG');
                    imageElement.src = image.uri;
                    if (imageElement.complete && imageElement.naturalWidth > 0 && imageElement.naturalHeight > 0) {
                        image.width = imageElement.naturalWidth;
                        image.height = imageElement.naturalHeight;
                    }
                    else {
                        imageElement.className = 'androme.preload';
                        imageElement.style.display = 'none';
                        documentRoot.appendChild(imageElement);
                    }
                }
            }
        }
        const images = Array.from(this.parseElements).map(element => {
            const incomplete: HTMLImageElement[] = [];
            Array.from(element.querySelectorAll('IMG')).forEach((image: HTMLImageElement) => {
                if (!(image instanceof SVGImageElement)) {
                    if (image.complete) {
                        this.addPreloadImage(image);
                    }
                    else {
                        incomplete.push(image);
                    }
                }
            });
            return incomplete;
        })
        .reduce((a, b) => a.concat(b), []);
        if (images.length === 0) {
            parseResume();
        }
        else {
            this.loading = true;
            Promise.all(images.map(image => {
                return new Promise((resolve, reject) => {
                    image.onload = resolve;
                    image.onerror = reject;
                });
            }))
            .then((result: Event[]) => {
                if (Array.isArray(result)) {
                    for (const item of result) {
                        try {
                            this.addPreloadImage(<HTMLImageElement> item.srcElement);
                        }
                        catch {
                        }
                    }
                }
                parseResume();
            })
            .catch((error: Event) => {
                const message = error.srcElement ? (<HTMLImageElement> error.srcElement).src : '';
                if (!hasValue(message) || confirm(`FAIL: ${message}`)) {
                    parseResume();
                }
            });
        }
        return {
            then: (resolve: () => void) => {
                if (this.loading) {
                    __THEN = resolve;
                }
                else {
                    resolve();
                }
            }
        };
    }

    public renderNode(data: LayoutData<T>) {
        if (data.itemCount === 0) {
            return this.viewController.renderNode(data);
        }
        else {
            return this.viewController.renderNodeGroup(data);
        }
    }

    public addLayoutFile(filename: string, content: string, pathname?: string, documentRoot = false) {
        pathname = pathname || this.viewController.localSettings.layout.pathName;
        const layout: FileAsset = {
            pathname,
            filename,
            content
        };
        if (documentRoot && this._views.length && this._views[0].content === '') {
            this._views[0] = layout;
        }
        else {
            this._views.push(layout);
        }
        this.processing.layout = layout;
    }

    public addIncludeFile(filename: string, content: string) {
        this._includes.push({
            pathname: this.viewController.localSettings.layout.pathName,
            filename,
            content
        });
    }

    public addRenderTemplate(node: T, parent: T, output: string, group = false) {
        if (output !== '') {
            if (group) {
                node.renderChildren.some((item: T) => {
                    for (const templates of this.processing.depthMap.values()) {
                        let content = templates.get(item.id);
                        if (content) {
                            const indent = node.renderDepth + 1;
                            if (item.renderDepth !== indent) {
                                content = replaceIndent(content, indent);
                                item.renderDepth = indent;
                            }
                            templates.set(item.id, content);
                            return true;
                        }
                    }
                    return false;
                });
            }
            if (!this.parseElements.has(<HTMLElement> node.element)) {
                if (node.dataset.target) {
                    const target = document.getElementById(node.dataset.target);
                    if (target && target !== parent.element) {
                        this.addRenderQueue(node.dataset.target, [output]);
                        node.positioned = true;
                        return;
                    }
                }
                else if (parent.dataset.target) {
                    const target = document.getElementById(parent.dataset.target);
                    if (target) {
                        this.addRenderQueue(parent.controlId, [output]);
                        node.dataset.target = parent.controlId;
                        return;
                    }
                }
            }
            const key = parent.id + (node.renderPosition !== -1 ? `:${node.renderPosition}` : '');
            if (!this.processing.depthMap.has(key)) {
                this.processing.depthMap.set(key, new Map<number, string>());
            }
            const template = this.processing.depthMap.get(key);
            if (template) {
                template.set(node.id, output);
            }
        }
    }

    public addRenderQueue(id: string, templates: string[]) {
        const items = this.session.renderQueue.get(id) || [];
        items.push(...templates);
        this.session.renderQueue.set(id, items);
     }

    public addPreloadImage(element: HTMLImageElement) {
        if (element && element.complete && hasValue(element.src)) {
            this.session.image.set(element.src, {
                width: element.naturalWidth,
                height: element.naturalHeight,
                uri: element.src
            });
        }
    }

    public preserveRenderPosition(node: T) {
        this._renderPosition[node.id.toString()] = node.map(item => item.id);
    }

    public getExtension(name: string) {
        return Array.from(this.extensions).find(item => item.name === name) || null;
    }

    public getExtensionOptionsValue(name: string, attr: string) {
        const ext = this.getExtension(name);
        if (ext && typeof ext.options === 'object') {
            return ext.options[attr];
        }
        return undefined;
    }

    public getExtensionOptionsValueAsObject(name: string, attr: string) {
        const value = this.getExtensionOptionsValue(name, attr);
        if (typeof value === 'object') {
            return value as object;
        }
        return null;
    }

    public getExtensionOptionsValueAsString(name: string, attr: string) {
        const value = this.getExtensionOptionsValue(name, attr);
        return typeof value === 'string' ? value : '';
    }

    public getExtensionOptionsValueAsNumber(name: string, attr: string) {
        const value = this.getExtensionOptionsValue(name, attr);
        return typeof value === 'number' ? value : 0;
    }

    public getExtensionOptionsValueAsBoolean(name: string, attr: string) {
        const value = this.getExtensionOptionsValue(name, attr);
        return typeof value === 'boolean' ? value : false;
    }

    public toString() {
        return this._views.length ? this._views[0].content : '';
    }

    protected createCache(documentRoot: HTMLElement) {
        let nodeTotal = 0;
        if (documentRoot === document.body) {
            Array.from(document.body.childNodes).some((item: Element) => isElementVisible(item, this.settings.hideOffScreenElements) && ++nodeTotal > 1);
        }
        const elements = documentRoot !== document.body ? documentRoot.querySelectorAll('*') : document.querySelectorAll(nodeTotal > 1 ? 'body, body *' : 'body *');
        this.processing.node = null;
        this.processing.cache.delegateAppend = undefined;
        this.processing.cache.clear();
        for (const ext of this.extensions) {
            ext.beforeInit(documentRoot);
        }
        const nodeRoot = this.insertNode(documentRoot);
        if (nodeRoot) {
            nodeRoot.parent = new this.nodeObject(0, (documentRoot === document.body ? documentRoot : documentRoot.parentElement) || document.body, this.viewController.delegateNodeInit);
            nodeRoot.documentRoot = true;
            this.processing.node = nodeRoot;
        }
        else {
            return false;
        }
        const localSettings = this.viewController.localSettings;
        const inlineAlways = localSettings.inline.always;
        const inlineSupport = this.settings.renderInlineText ? new Set<string>() : localSettings.inline.tagName;
        function inlineElement(element: Element) {
            const styleMap = getElementCache(element, 'styleMap');
            return (
                (styleMap === undefined || Object.keys(styleMap).length === 0) &&
                element.children.length === 0 &&
                inlineSupport.has(element.tagName)
            );
        }
        for (const element of Array.from(elements) as HTMLElement[]) {
            if (!this.parseElements.has(element)) {
                prioritizeExtensions(documentRoot, element, Array.from(this.extensions)).some(item => item.init(element));
                if (!this.parseElements.has(element) && !localSettings.unsupported.tagName.has(element.tagName)) {
                    if (inlineAlways.includes(element.tagName) || (inlineElement(element) && element.parentElement && Array.from(element.parentElement.children).every(item => inlineElement(item)))) {
                        setElementCache(element, 'inlineSupport', true);
                    }
                    let valid = true;
                    let current = element.parentElement;
                    while (current) {
                        if (current === documentRoot) {
                            break;
                        }
                        else if (current !== documentRoot && this.parseElements.has(current)) {
                            valid = false;
                            break;
                        }
                        current = current.parentElement;
                    }
                    if (valid) {
                        let styleMap = getElementCache(element, 'styleMap');
                        if (styleMap === undefined) {
                            styleMap = {};
                            setElementCache(element, 'styleMap', styleMap);
                        }
                        switch (element.tagName) {
                            case 'SELECT':
                                if (styleMap.verticalAlign === undefined && (<HTMLSelectElement> element).size > 1) {
                                    styleMap.verticalAlign = 'text-bottom';
                                }
                                break;
                        }
                        this.insertNode(element);
                    }
                }
            }
        }
        if (this.processing.cache.length) {
            for (const node of this.processing.cache) {
                const nodes: Element[] = [];
                let valid = false;
                Array.from(node.element.childNodes).forEach((element: Element) => {
                    if (element.nodeName === '#text') {
                        if (node.tagName !== 'SELECT') {
                            nodes.push(element);
                        }
                    }
                    else if (element.tagName !== 'BR') {
                        const elementNode = Node.getNodeFromElement(element);
                        if (!inlineSupport.has(element.tagName) || (elementNode && !elementNode.excluded)) {
                            valid = true;
                        }
                    }
                });
                if (valid) {
                    nodes.forEach(element => this.insertNode(element, node));
                }
            }
            const preAlignment: ObjectIndex<StringMap> = {};
            const direction: HTMLElement[] = [];
            for (const node of this.processing.cache) {
                if (node.styleElement) {
                    const element = <HTMLElement> node.element;
                    const textAlign = node.css('textAlign');
                    preAlignment[node.id] = {};
                    const attrs = preAlignment[node.id];
                    ['right', 'end', element.tagName !== 'BUTTON' && (<HTMLInputElement> element).type !== 'button' ? 'center' : ''].some(value => {
                        if (value === textAlign) {
                            attrs.textAlign = value;
                            element.style.textAlign = 'left';
                            return true;
                        }
                        return false;
                    });
                    if (node.marginLeft < 0) {
                        attrs.marginLeft = node.css('marginLeft');
                        element.style.marginLeft = '0px';
                    }
                    if (node.marginTop < 0) {
                        attrs.marginTop = node.css('marginTop');
                        element.style.marginTop = '0px';
                    }
                    if (node.position === 'relative') {
                        ['top', 'right', 'bottom', 'left'].forEach(value => {
                            if (node.has(value)) {
                                attrs[value] = node.styleMap[value];
                                element.style[value] = 'auto';
                            }
                        });
                    }
                    if (node.overflowX || node.overflowY) {
                        if (node.has('width')) {
                            attrs.width = node.styleMap.width;
                            element.style.width = 'auto';
                        }
                        if (node.has('height')) {
                            attrs.height = node.styleMap.height;
                            element.style.height = 'auto';
                        }
                        attrs.overflow = node.style.overflow || '';
                        element.style.overflow = 'visible';
                    }
                    if (element.dir === 'rtl') {
                        element.dir = 'ltr';
                        direction.push(element);
                    }
                    node.setBounds();
                }
                node.setMultiLine();
            }
            for (const node of this.processing.cache) {
                if (node.styleElement) {
                    const element = <HTMLElement> node.element;
                    const attrs = preAlignment[node.id];
                    if (attrs) {
                        for (const attr in attrs) {
                            element.style[attr] = attrs[attr];
                        }
                        if (direction.includes(element)) {
                            element.dir = 'rtl';
                        }
                    }
                }
                if (node.length === 1) {
                    const firstNode = node.item(0) as T;
                    if (!firstNode.pageflow && firstNode.toInt('top') === 0 && firstNode.toInt('right') === 0 && firstNode.toInt('bottom') === 0 && firstNode.toInt('left') === 0) {
                        firstNode.pageflow = true;
                    }
                }
            }
            for (const node of this.processing.cache) {
                if (!node.documentRoot) {
                    let parent: T | null = node.getParentElementAsNode(this.settings.supportNegativeLeftTop) as T;
                    if (!parent && !node.pageflow) {
                        parent = this.processing.node;
                    }
                    if (parent) {
                        node.parent = parent;
                        node.documentParent = parent;
                    }
                    else {
                        node.hide();
                    }
                }
            }
            for (const node of this.processing.cache.elements) {
                if (node.htmlElement) {
                    let i = 0;
                    Array.from(node.element.childNodes).forEach((element: Element) => {
                        const item = Node.getNodeFromElement(element);
                        if (item && !item.excluded && item.pageflow) {
                            item.siblingIndex = i++;
                        }
                    });
                    if (node.length) {
                        node.sort(NodeList.siblingIndex);
                        node.initial.children.push(...node.duplicate());
                    }
                }
            }
            sortAsc(this.processing.cache.children, 'depth', 'id');
            for (const ext of this.extensions) {
                ext.afterInit(documentRoot);
            }
            return true;
        }
        return false;
    }

    protected setBaseLayout() {
        const localSettings = this.viewController.localSettings;
        const documentRoot = this.processing.node as T;
        const mapX: LayoutMapX<T> = [];
        const mapY: LayoutMapY<T> = new Map<number, Map<number, T>>();
        const extensions = Array.from(this.extensions).filter(item => !item.eventOnly);
        let baseTemplate = localSettings.baseTemplate;
        let empty = true;
        function setMapY(depth: number, id: number, node: T) {
            const index = mapY.get(depth) || new Map<number, T>();
            index.set(id, node);
            mapY.set(depth, index);
        }
        function deleteMapY(id: number) {
            for (const mapNode of mapY.values()) {
                for (const node of mapNode.values()) {
                    if (node.id === id) {
                        mapNode.delete(node.id);
                        return;
                    }
                }
            }
        }
        setMapY(-1, 0, documentRoot.parent as T);
        let maxDepth = 0;
        for (const node of this.processing.cache.visible) {
            const x = Math.floor(node.linear.left);
            if (mapX[node.depth] === undefined) {
                mapX[node.depth] = {};
            }
            if (mapX[node.depth][x] === undefined) {
                mapX[node.depth][x] = [];
            }
            mapX[node.depth][x].push(node);
            setMapY(node.depth, node.id, node);
            maxDepth = Math.max(node.depth, maxDepth);
        }
        for (let i = 0; i < maxDepth; i++) {
            mapY.set((i * -1) - 2, new Map<number, T>());
        }
        this.processing.cache.delegateAppend = (node: T) => {
            deleteMapY(node.id);
            setMapY((node.initial.depth * -1) - 2, node.id, node);
            node.cascade().forEach((item: T) => {
                deleteMapY(item.id);
                setMapY((item.initial.depth * -1) - 2, item.id, item);
            });
        };
        for (const depth of mapY.values()) {
            this.processing.depthMap.clear();
            for (const parent of depth.values()) {
                if (parent.length === 0 || parent.every(node => node.rendered)) {
                    continue;
                }
                const axisY: T[] = [];
                const below: T[] = [];
                const middle: T[] = [];
                const above: T[] = [];
                parent.each((node: T) => {
                    if (node.pageflow || node.alignOrigin) {
                        middle.push(node);
                    }
                    else {
                        if (node.toInt('zIndex') >= 0 || node.parent.element !== node.element.parentElement) {
                            above.push(node);
                        }
                        else {
                            below.push(node);
                        }
                    }
                });
                NodeList.sortByAlignment(middle, NODE_ALIGNMENT.NONE, parent);
                axisY.push(...sortAsc(below, 'style.zIndex', 'id'));
                axisY.push(...middle);
                axisY.push(...sortAsc(above, 'style.zIndex', 'id'));
                const floatEnabled = axisY.some(node => node.floating);
                const cleared = floatEnabled ? NodeList.clearedAll(parent) : undefined;
                let k = -1;
                while (++k < axisY.length) {
                    let nodeY = axisY[k];
                    if (!nodeY.visible || nodeY.rendered || (!nodeY.documentRoot && this.parseElements.has(<HTMLElement> nodeY.element))) {
                        continue;
                    }
                    let parentY = nodeY.parent as T;
                    if (nodeY.renderAs) {
                        parentY.remove(nodeY);
                        nodeY.hide();
                        nodeY = nodeY.renderAs as T;
                    }
                    if (!nodeY.hasBit('excludeSection', APP_SECTION.DOM_TRAVERSE) && axisY.length > 1 && k < axisY.length - 1) {
                        if (nodeY.pageflow && !parentY.hasAlign(NODE_ALIGNMENT.AUTO_LAYOUT) && (parentY.alignmentType === NODE_ALIGNMENT.NONE || parentY.hasAlign(NODE_ALIGNMENT.UNKNOWN) || nodeY.hasAlign(NODE_ALIGNMENT.EXTENDABLE))) {
                            const linearVertical = parentY.linearVertical;
                            const horizontal: T[] = [];
                            const vertical: T[] = [];
                            const floatAvailable = new Set(['left', 'right']);
                            let verticalExtended = false;
                            function checkHorizontal(node: T) {
                                if (vertical.length || verticalExtended) {
                                    return false;
                                }
                                horizontal.push(node);
                                return true;
                            }
                            function checkVertical(node: T) {
                                if (linearVertical && vertical.length) {
                                    const previousAbove = vertical[vertical.length - 1];
                                    if (previousAbove.linearVertical) {
                                        node.parent = previousAbove;
                                        return true;
                                    }
                                }
                                vertical.push(node);
                                return true;
                            }
                            let l = k;
                            let m = 0;
                            if (nodeY.hasAlign(NODE_ALIGNMENT.EXTENDABLE)) {
                                horizontal.push(nodeY);
                                l++;
                                m++;
                            }
                            domNested: {
                                for ( ; l < axisY.length; l++, m++) {
                                    const adjacent = axisY[l];
                                    if (adjacent.pageflow) {
                                        if (floatEnabled) {
                                            const float = cleared && cleared.get(adjacent);
                                            if (float) {
                                                if (float === 'both') {
                                                    floatAvailable.clear();
                                                }
                                                else {
                                                    floatAvailable.delete(float);
                                                }
                                            }
                                            if (adjacent.floating) {
                                                floatAvailable.add(adjacent.float);
                                            }
                                        }
                                        const previousSibling = adjacent.previousSibling() as T;
                                        const nextSibling = adjacent.nextSibling(true);
                                        if (m === 0 && nextSibling) {
                                            if (adjacent.blockStatic || nextSibling.alignedVertically(adjacent, cleared, 0, true)) {
                                                vertical.push(adjacent);
                                            }
                                            else {
                                                horizontal.push(adjacent);
                                            }
                                        }
                                        else if (previousSibling) {
                                            if (floatEnabled) {
                                                const floated = NodeList.floated([...horizontal, ...vertical]);
                                                const pending = [...horizontal, ...vertical, adjacent];
                                                const clearedPartial = NodeList.cleared(pending);
                                                const clearedPrevious = new Map<T, string>();
                                                if (clearedPartial.has(previousSibling) || (previousSibling.lineBreak && cleared && cleared.has(previousSibling))) {
                                                    clearedPrevious.set(previousSibling, previousSibling.css('clear'));
                                                }
                                                const verticalAlign = adjacent.alignedVertically(previousSibling, clearedPrevious, floated.size);
                                                if (verticalAlign || clearedPartial.has(adjacent) || (this.settings.floatOverlapDisabled && previousSibling.floating && adjacent.blockStatic && floatAvailable.size === 2)) {
                                                    if (horizontal.length) {
                                                        if (!this.settings.floatOverlapDisabled) {
                                                            if (floatAvailable.size > 0 && !pending.map(node => clearedPartial.get(node)).includes('both') && (
                                                                    floated.size === 0 ||
                                                                    adjacent.bounds.top < Math.max.apply(null, horizontal.filter(node => node.floating).map(node => node.bounds.bottom))
                                                               ))
                                                            {
                                                                if (clearedPartial.has(adjacent)) {
                                                                    if (floatAvailable.size < 2 && floated.size === 2 && !adjacent.floating) {
                                                                        adjacent.alignmentType |= NODE_ALIGNMENT.EXTENDABLE;
                                                                        verticalExtended = true;
                                                                        horizontal.push(adjacent);
                                                                        continue;
                                                                    }
                                                                    break domNested;
                                                                }
                                                                else if (!verticalAlign) {
                                                                    horizontal.push(adjacent);
                                                                    continue;
                                                                }
                                                                if (floated.size === 1 && (!adjacent.floating || floatAvailable.has(adjacent.float))) {
                                                                    horizontal.push(adjacent);
                                                                    continue;
                                                                }
                                                            }
                                                        }
                                                        break domNested;
                                                    }
                                                    checkVertical(adjacent);
                                                }
                                                else {
                                                    if (!checkHorizontal(adjacent)) {
                                                        break domNested;
                                                    }
                                                }
                                            }
                                            else {
                                                if (adjacent.alignedVertically(previousSibling)) {
                                                    checkVertical(adjacent);
                                                }
                                                else {
                                                    if (!checkHorizontal(adjacent)) {
                                                        break domNested;
                                                    }
                                                }
                                            }
                                        }
                                        else {
                                            break domNested;
                                        }
                                    }
                                }
                            }
                            const layoutData = Application.createLayoutData(null as any, parentY);
                            let output = '';
                            if (horizontal.length > 1) {
                                layoutData.items = horizontal;
                                layoutData.itemCount = horizontal.length;
                                const floated = NodeList.floated(horizontal);
                                const clearedPartial = NodeList.cleared(horizontal);
                                if (Application.constraintFloat(horizontal, floated)) {
                                    layoutData.node = this.viewController.createNodeGroup(nodeY, parentY, horizontal);
                                    layoutData.containerType = NODE_CONTAINER.CONSTRAINT;
                                    layoutData.alignmentType |= NODE_ALIGNMENT.FLOAT | (floated.has('right') ? NODE_ALIGNMENT.RIGHT : 0);
                                }
                                else if (Application.frameHorizontal(horizontal, floated, clearedPartial)) {
                                    layoutData.node = this.viewController.createNodeGroup(nodeY, parentY, horizontal);
                                    output = this.processLayoutHorizontal(layoutData.node, parentY, horizontal, clearedPartial);
                                }
                                else if (horizontal.length !== axisY.length) {
                                    if (Application.relativeHorizontal(horizontal, clearedPartial)) {
                                        layoutData.node = this.viewController.createNodeGroup(nodeY, parentY, horizontal);
                                        layoutData.containerType = NODE_CONTAINER.RELATIVE;
                                        layoutData.alignmentType |= NODE_ALIGNMENT.HORIZONTAL;
                                    }
                                    else {
                                        layoutData.node = this.viewController.createNodeGroup(nodeY, parentY, horizontal);
                                        layoutData.containerType = NODE_CONTAINER.LINEAR;
                                        layoutData.alignmentType |= NODE_ALIGNMENT.HORIZONTAL;
                                        if (floated.size > 0) {
                                            layoutData.alignmentType |= NODE_ALIGNMENT.FLOAT | (floated.has('right') ? NODE_ALIGNMENT.RIGHT : 0);
                                        }
                                    }
                                }
                            }
                            else if (vertical.length > 1) {
                                layoutData.items = vertical;
                                layoutData.itemCount = vertical.length;
                                const floated = NodeList.floated(vertical);
                                const clearedPartial = NodeList.cleared(vertical);
                                if (floated.size > 0 && clearedPartial.size > 0 && !(floated.size === 1 && vertical.slice(1, vertical.length - 1).every(node => clearedPartial.has(node)))) {
                                    if (parentY.linearVertical && !hasValue(nodeY.dataset.ext)) {
                                        layoutData.node = nodeY;
                                        output = this.processLayoutVertical(undefined, parentY, vertical, clearedPartial);
                                    }
                                    else {
                                        layoutData.node = this.viewController.createNodeGroup(nodeY, parentY, vertical);
                                        output = this.processLayoutVertical(layoutData.node, parentY, vertical, clearedPartial);
                                    }
                                }
                                else if (vertical.length !== axisY.length) {
                                    if (!linearVertical) {
                                        layoutData.node = this.viewController.createNodeGroup(nodeY, parentY, vertical);
                                        layoutData.containerType = NODE_CONTAINER.LINEAR;
                                        layoutData.alignmentType |= NODE_ALIGNMENT.VERTICAL;
                                    }
                                    const segmentEnd = vertical[vertical.length - 1];
                                    if (!segmentEnd.blockStatic && segmentEnd !== axisY[axisY.length - 1]) {
                                        segmentEnd.alignmentType |= NODE_ALIGNMENT.EXTENDABLE;
                                    }
                                }
                            }
                            if (layoutData.node) {
                                if (output === '') {
                                    output = this.renderNode(layoutData);
                                }
                                this.addRenderTemplate(layoutData.node, parentY, output, true);
                                parentY = nodeY.parent as T;
                            }
                            nodeY.alignmentType ^= NODE_ALIGNMENT.EXTENDABLE;
                        }
                    }
                    if (!nodeY.hasBit('excludeSection', APP_SECTION.EXTENSION) && !nodeY.rendered) {
                        let next = false;
                        for (const ext of [...parentY.renderExtension, ...extensions.filter(item => item.subscribersChild.has(nodeY))]) {
                            const result = ext.processChild(nodeY, parentY);
                            if (result.output !== '') {
                                this.addRenderTemplate(nodeY, parentY, result.output);
                            }
                            if (result.renderAs && result.renderOutput) {
                                this.addRenderTemplate(result.renderAs as T, parentY, result.renderOutput);
                            }
                            if (result.parent) {
                                parentY = result.parent as T;
                            }
                            next = result.next === true;
                            if (result.complete || result.next) {
                                break;
                            }
                        }
                        if (next) {
                            continue;
                        }
                        if (nodeY.styleElement) {
                            const processed: Extension<T>[] = [];
                            prioritizeExtensions(<HTMLElement> documentRoot.element, <HTMLElement> nodeY.element, extensions).some(item => {
                                if (item.is(nodeY) && item.condition(nodeY, parentY)) {
                                    const result =  item.processNode(nodeY, parentY, mapX, mapY);
                                    if (result.output !== '') {
                                        this.addRenderTemplate(nodeY, parentY, result.output);
                                    }
                                    if (result.renderAs && result.renderOutput) {
                                        this.addRenderTemplate(result.renderAs as T, parentY, result.renderOutput);
                                    }
                                    if (result.parent) {
                                        parentY = result.parent as T;
                                    }
                                    if (isString(result.output) || result.include === true) {
                                        processed.push(item);
                                    }
                                    next = result.next === true;
                                    if (result.complete || result.next) {
                                        return true;
                                    }
                                }
                                return false;
                            });
                            processed.forEach(item => item.subscribers.add(nodeY) && nodeY.renderExtension.add(item));
                            if (next) {
                                continue;
                            }
                        }
                    }
                    if (!nodeY.hasBit('excludeSection', APP_SECTION.RENDER) && !nodeY.rendered) {
                        const layoutData = Application.createLayoutData(nodeY, parentY);
                        const containerType = Controller.getContainerType(nodeY.tagName);
                        let output = '';
                        if (containerType === 0) {
                            const borderVisible = nodeY.borderVisible;
                            const backgroundImage = REGEX_PATTERN.CSS_URL.test(nodeY.css('backgroundImage')) || REGEX_PATTERN.CSS_URL.test(nodeY.css('background'));
                            const backgroundColor = nodeY.has('backgroundColor');
                            const backgroundVisible = borderVisible || backgroundImage || backgroundColor;
                            if (nodeY.length === 0) {
                                const freeFormText = hasFreeFormText(nodeY.element, this.settings.renderInlineText ? 0 : 1);
                                if (freeFormText || (borderVisible && nodeY.textContent.length)) {
                                    layoutData.containerType = NODE_CONTAINER.TEXT;
                                }
                                else if (backgroundImage && nodeY.css('backgroundRepeat') === 'no-repeat' && (!nodeY.inlineText || nodeY.toInt('textIndent') + nodeY.bounds.width < 0)) {
                                    layoutData.containerType = NODE_CONTAINER.IMAGE;
                                    layoutData.alignmentType |= NODE_ALIGNMENT.SINGLE;
                                    nodeY.excludeResource |= NODE_RESOURCE.FONT_STYLE | NODE_RESOURCE.VALUE_STRING;
                                }
                                else if (nodeY.block && (backgroundColor || backgroundImage) && (borderVisible || nodeY.paddingTop + nodeY.paddingRight + nodeY.paddingRight + nodeY.paddingLeft > 0)) {
                                    layoutData.containerType = NODE_CONTAINER.LINE;
                                }
                                else if (!nodeY.documentRoot) {
                                    if (this.settings.collapseUnattributedElements && nodeY.bounds.height === 0 && !hasValue(nodeY.element.id) && !hasValue(nodeY.dataset.ext) && !backgroundVisible) {
                                        parentY.remove(nodeY);
                                        nodeY.hide();
                                    }
                                    else if (backgroundVisible) {
                                        layoutData.containerType = NODE_CONTAINER.TEXT;
                                    }
                                    else {
                                        layoutData.containerType = NODE_CONTAINER.FRAME;
                                    }
                                }
                            }
                            else {
                                layoutData.items = nodeY.children as T[];
                                layoutData.itemCount = nodeY.length;
                                if (nodeY.has('columnCount')) {
                                    layoutData.containerType = NODE_CONTAINER.CONSTRAINT;
                                    layoutData.alignmentType |= NODE_ALIGNMENT.COLUMN | NODE_ALIGNMENT.AUTO_LAYOUT;
                                    layoutData.columnCount = nodeY.toInt('columnCount');
                                }
                                else if (nodeY.some(node => !node.pageflow)) {
                                    layoutData.containerType = NODE_CONTAINER.CONSTRAINT;
                                    layoutData.alignmentType |= NODE_ALIGNMENT.ABSOLUTE | NODE_ALIGNMENT.UNKNOWN;
                                }
                                else {
                                    if (nodeY.length === 1) {
                                        const targeted = nodeY.filter(node => {
                                            if (node.dataset.target) {
                                                const element = document.getElementById(node.dataset.target);
                                                return element !== null && hasValue(element.dataset.ext) && element !== parentY.element;
                                            }
                                            return false;
                                        });
                                        const child = nodeY.item(0) as T;
                                        if (nodeY.documentRoot && targeted.length === 1) {
                                            nodeY.hide();
                                            continue;
                                        }
                                        else if (
                                            this.settings.collapseUnattributedElements &&
                                            !hasValue(nodeY.element.id) &&
                                            !hasValue(nodeY.dataset.ext) &&
                                            !hasValue(nodeY.dataset.target) &&
                                            nodeY.toInt('width') === 0 &&
                                            nodeY.toInt('height') === 0 &&
                                            !child.hasWidth && !child.borderVisible &&
                                            !backgroundVisible &&
                                            !nodeY.has('textAlign') && !nodeY.has('verticalAlign') &&
                                            nodeY.float !== 'right' && !nodeY.autoMargin && nodeY.alignOrigin &&
                                            !this.viewController.hasAppendProcessing(nodeY.id))
                                        {
                                            child.documentRoot = nodeY.documentRoot;
                                            child.siblingIndex = nodeY.siblingIndex;
                                            child.parent = parentY;
                                            nodeY.resetBox(BOX_STANDARD.MARGIN | BOX_STANDARD.PADDING, child, true);
                                            nodeY.hide();
                                            axisY[k] = child;
                                            k--;
                                            continue;
                                        }
                                        else {
                                            layoutData.containerType = NODE_CONTAINER.FRAME;
                                            layoutData.alignmentType |= NODE_ALIGNMENT.SINGLE;
                                        }
                                    }
                                    else {
                                        const children = nodeY.children as T[];
                                        const [linearX, linearY] = [NodeList.linearX(children), NodeList.linearY(children)];
                                        const floated = NodeList.floated(children);
                                        const clearedInside = NodeList.clearedAll(nodeY);
                                        const relativeWrap = children.every(node => node.pageflow && node.inlineElement);
                                        if (Application.constraintFloat(children, floated, linearX)) {
                                            layoutData.containerType = NODE_CONTAINER.CONSTRAINT;
                                            layoutData.alignmentType |= NODE_ALIGNMENT.FLOAT | (floated.has('right') ? NODE_ALIGNMENT.RIGHT : 0);
                                        }
                                        else if (linearX && clearedInside.size === 0) {
                                            if (floated.size === 0 && children.every(node => node.toInt('verticalAlign') === 0)) {
                                                if (children.some(node => ['text-top', 'text-bottom'].includes(node.css('verticalAlign')))) {
                                                    layoutData.containerType = NODE_CONTAINER.CONSTRAINT;
                                                    layoutData.alignmentType |= NODE_ALIGNMENT.HORIZONTAL;
                                                }
                                                else if (Application.relativeHorizontal(children)) {
                                                    layoutData.containerType = NODE_CONTAINER.RELATIVE;
                                                    layoutData.alignmentType |= NODE_ALIGNMENT.HORIZONTAL;
                                                }
                                            }
                                            if (layoutData.containerType === 0 && (floated.size === 0 || !floated.has('right'))) {
                                                if (Application.relativeHorizontal(children)) {
                                                    layoutData.containerType = NODE_CONTAINER.RELATIVE;
                                                }
                                                else {
                                                    layoutData.containerType = NODE_CONTAINER.LINEAR;
                                                }
                                                layoutData.alignmentType |= NODE_ALIGNMENT.HORIZONTAL;
                                            }
                                        }
                                        else if (linearY || (!relativeWrap && children.some(node => node.alignedVertically(node.previousSibling(), clearedInside, floated.size)))) {
                                            layoutData.containerType = NODE_CONTAINER.LINEAR;
                                            layoutData.alignmentType |= NODE_ALIGNMENT.VERTICAL;
                                            if (!linearY || nodeY.documentRoot) {
                                                layoutData.alignmentType |= NODE_ALIGNMENT.UNKNOWN;
                                            }
                                        }
                                        if (layoutData.containerType === 0) {
                                            if (relativeWrap) {
                                                if (Application.frameHorizontal(children, floated, clearedInside, true)) {
                                                    output = this.processLayoutHorizontal(nodeY, parentY, children, clearedInside);
                                                }
                                                else {
                                                    layoutData.containerType = NODE_CONTAINER.RELATIVE;
                                                    layoutData.alignmentType |= NODE_ALIGNMENT.HORIZONTAL | NODE_ALIGNMENT.UNKNOWN;
                                                }
                                            }
                                            else {
                                                layoutData.containerType = NODE_CONTAINER.CONSTRAINT;
                                                layoutData.alignmentType |= NODE_ALIGNMENT.UNKNOWN;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        else {
                            layoutData.containerType = containerType;
                        }
                        if (output === '' && layoutData.containerType !== 0) {
                            output = this.renderNode(layoutData);
                        }
                        this.addRenderTemplate(nodeY, parentY, output);
                    }
                }
            }
            for (const [key, templates] of this.processing.depthMap.entries()) {
                const parentId = key.split(':')[0];
                if (this._renderPosition[parentId]) {
                    const sorted = new Map<number, string>();
                    this._renderPosition[parentId].forEach(id => {
                        const result = templates.get(id);
                        if (result) {
                            sorted.set(id, result);
                        }
                    });
                    if (sorted.size === templates.size) {
                        this.processing.depthMap.set(key, sorted);
                    }
                }
            }
            for (const ext of this.extensions) {
                ext.afterDepthLevel();
            }
            for (const [key, templates] of this.processing.depthMap.entries()) {
                if (templates.size > 0) {
                    const [parentId, position] = key.split(':');
                    const views = Array.from(templates.values());
                    const id = parentId + (position ? `:${position}` : '');
                    const placeholder = formatPlaceholder(id);
                    if (baseTemplate.indexOf(placeholder) !== -1) {
                        baseTemplate = replacePlaceholder(baseTemplate, placeholder, views.join(''));
                        empty = false;
                    }
                    else {
                        this.addRenderQueue(id, views);
                    }
                }
            }
        }
        if (documentRoot.dataset.layoutName && (!hasValue(documentRoot.dataset.target) || documentRoot.renderExtension.size === 0)) {
            this.addLayoutFile(
                documentRoot.dataset.layoutName,
                !empty ? baseTemplate : '',
                trimString(trimNull(documentRoot.dataset.pathname), '/'),
                documentRoot.renderExtension.size > 0 && Array.from(documentRoot.renderExtension).some(item => item.documentRoot)
            );
        }
        if (empty && documentRoot.renderExtension.size === 0) {
            documentRoot.hide();
        }
        this.processing.cache.sort((a, b) => {
            if (!a.visible) {
                return 1;
            }
            else if (!b.visible) {
                return -1;
            }
            else if (a.renderDepth !== b.renderDepth) {
                return a.renderDepth < b.renderDepth ? -1 : 1;
            }
            else {
                if (!a.domElement) {
                    const nodeA = Node.getNodeFromElement(a.element);
                    if (nodeA) {
                        a = nodeA as T;
                    }
                    else {
                        return 1;
                    }
                }
                if (!b.domElement) {
                    const nodeB = Node.getNodeFromElement(a.element);
                    if (nodeB) {
                        b = nodeB as T;
                    }
                    else {
                        return -1;
                    }
                }
                if (a.documentParent !== b.documentParent) {
                    return a.documentParent.id < b.documentParent.id ? -1 : 1;
                }
                else {
                    return a.renderIndex < b.renderIndex ? -1 : 1;
                }
            }
        });
        this.session.cache.children.push(...this.processing.cache.duplicate());
        for (const ext of this.extensions) {
            for (const node of ext.subscribers) {
                ext.postBaseLayout(node);
            }
        }
        for (const ext of this.extensions) {
            ext.afterBaseLayout();
        }
    }

    protected setConstraints() {
        this.viewController.setConstraints();
        for (const ext of this.extensions) {
            ext.afterConstraints();
        }
    }

    protected setResources() {
        this.resourceHandler.setBoxStyle();
        this.resourceHandler.setFontStyle();
        this.resourceHandler.setBoxSpacing();
        this.resourceHandler.setValueString();
        this.resourceHandler.setOptionArray();
        this.resourceHandler.setImageSource();
        for (const ext of this.extensions) {
            ext.afterResources();
        }
    }

    protected insertNode(element: Element, parent?: T) {
        let node: T | null = null;
        if (element.nodeName.charAt(0) === '#') {
            if (element.nodeName === '#text') {
                if (isPlainText(element, true) || cssParent(element, 'whiteSpace', 'pre', 'pre-wrap')) {
                    node = new this.nodeObject(this.processing.cache.nextId, element, this.viewController.delegateNodeInit);
                    if (parent) {
                        node.parent = parent;
                        node.inherit(parent, 'style');
                    }
                    else {
                        node.css('whiteSpace', getStyle(element.parentElement).whiteSpace || 'normal');
                    }
                    node.css({
                        position: 'static',
                        display: 'inline',
                        clear: 'none',
                        cssFloat: 'none',
                        verticalAlign: 'baseline'
                    });
                }
            }
        }
        else if (isStyleElement(element)) {
            const elementNode = new this.nodeObject(this.processing.cache.nextId, element, this.viewController.delegateNodeInit);
            if (isElementVisible(element, this.settings.hideOffScreenElements)) {
                node = elementNode;
                node.setExclusions();
            }
            else {
                elementNode.excluded = true;
                elementNode.visible = false;
            }
        }
        if (node) {
            this.processing.cache.append(node);
        }
        return node;
    }

    protected processLayoutHorizontal(group: T, parent: T, nodes: T[], cleared: Map<T, string>) {
        let layerIndex: Array<T[] | T[][]> = [];
        let output = '';
        if (cleared.size === 0 && nodes.every(node => !node.autoMargin)) {
            const inline: T[] = [];
            const left: T[] = [];
            const right: T[] = [];
            for (const node of nodes) {
                if (node.float === 'right') {
                    right.push(node);
                }
                else if (node.float === 'left') {
                    left.push(node);
                }
                else {
                    inline.push(node);
                }
            }
            const layoutData = Application.createLayoutData(group, parent);
            if (inline.length === nodes.length || left.length === nodes.length || right.length === nodes.length) {
                layoutData.alignmentType |= NODE_ALIGNMENT.HORIZONTAL;
                layoutData.items = nodes;
                layoutData.itemCount = nodes.length;
                if (inline.length === 0) {
                    layoutData.alignmentType |= NODE_ALIGNMENT.FLOAT + (right.length ? NODE_ALIGNMENT.RIGHT : 0);
                }
                if (Application.relativeHorizontal(nodes, cleared)) {
                    layoutData.containerType = NODE_CONTAINER.RELATIVE;
                    return this.renderNode(layoutData);
                }
                else {
                    layoutData.containerType = NODE_CONTAINER.LINEAR;
                    return this.renderNode(layoutData);
                }
            }
            else if (left.length === 0 || right.length === 0) {
                layoutData.alignmentType |= NODE_ALIGNMENT.FLOAT;
                const subgroup: T[] = [];
                if (right.length === 0) {
                    subgroup.push(...left, ...inline);
                }
                else {
                    layoutData.alignmentType |= NODE_ALIGNMENT.RIGHT;
                    subgroup.push(...inline, ...right);
                }
                layoutData.items = subgroup;
                layoutData.itemCount = subgroup.length;
                if (NodeList.linearY(subgroup)) {
                    layoutData.containerType = NODE_CONTAINER.LINEAR;
                    layoutData.alignmentType |= NODE_ALIGNMENT.VERTICAL;
                    return this.renderNode(layoutData);
                }
                else if (Application.relativeHorizontal(subgroup, cleared)) {
                    layoutData.containerType = NODE_CONTAINER.RELATIVE;
                    return this.renderNode(layoutData);
                }
                else if (!this.settings.floatOverlapDisabled && right.length === 0) {
                    layoutData.containerType = NODE_CONTAINER.LINEAR;
                    layoutData.alignmentType |= NODE_ALIGNMENT.HORIZONTAL;
                    output = this.renderNode(layoutData);
                    layerIndex.push(left, inline);
                }
            }
        }
        const inlineAbove: T[] = [];
        const inlineBelow: T[] = [];
        const leftAbove: T[] = [];
        const rightAbove: T[] = [];
        const leftBelow: T[] = [];
        const rightBelow: T[] = [];
        let leftSub: T[] | T[][] = [];
        let rightSub: T[] | T[][] = [];
        if (layerIndex.length === 0) {
            let current = '';
            let pendingFloat = 0;
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                if (cleared.has(node)) {
                    const clear = cleared.get(node);
                    if (hasBit(pendingFloat, clear === 'right' ? 4 : 2) || (pendingFloat !== 0 && clear === 'both')) {
                        switch (clear) {
                            case 'left':
                                pendingFloat ^= 2;
                                current = 'left';
                                break;
                            case 'right':
                                pendingFloat ^= 4;
                                current = 'right';
                                break;
                            case 'both':
                                switch (pendingFloat) {
                                    case 2:
                                        current = 'left';
                                        break;
                                    case 4:
                                        current = 'right';
                                        break;
                                    default:
                                        current = 'both';
                                        break;
                                }
                                pendingFloat = 0;
                                break;
                        }
                    }
                }
                if (current === '') {
                    if (node.floating) {
                        if (node.float === 'right') {
                            rightAbove.push(node);
                            if (node.floating) {
                                pendingFloat |= 4;
                            }
                        }
                        else {
                            leftAbove.push(node);
                            if (node.floating) {
                                pendingFloat |= 2;
                            }
                        }
                    }
                    else if (node.autoMargin) {
                        if (node.autoMarginLeft) {
                            if (rightAbove.length) {
                                rightBelow.push(node);
                            }
                            else {
                                rightAbove.push(node);
                            }
                        }
                        else if (node.autoMarginRight) {
                            if (leftAbove.length) {
                                leftBelow.push(node);
                            }
                            else {
                                leftAbove.push(node);
                            }
                        }
                        else {
                            if (inlineAbove.length) {
                                if (leftAbove.length === 0) {
                                    leftAbove.push(node);
                                }
                                else {
                                    rightAbove.push(node);
                                }
                            }
                            else {
                                inlineAbove.push(node);
                            }
                        }
                    }
                    else {
                        inlineAbove.push(node);
                    }
                }
                else {
                    if (node.floating) {
                        if (node.float === 'right') {
                            if (rightBelow.length === 0) {
                                pendingFloat |= 4;
                            }
                            if (!this.settings.floatOverlapDisabled && current !== 'right' && rightAbove.length) {
                                rightAbove.push(node);
                            }
                            else {
                                rightBelow.push(node);
                            }
                        }
                        else {
                            if (leftBelow.length === 0) {
                                pendingFloat |= 2;
                            }
                            if (!this.settings.floatOverlapDisabled && current !== 'left' && leftAbove.length) {
                                leftAbove.push(node);
                            }
                            else {
                                leftBelow.push(node);
                            }
                        }
                    }
                    else if (node.autoMargin) {
                        if (node.autoMarginLeft && rightBelow.length) {
                            rightBelow.push(node);
                        }
                        else if (node.autoMarginRight && leftBelow.length) {
                            leftBelow.push(node);
                        }
                        else {
                            inlineBelow.push(node);
                        }
                    }
                    else {
                        switch (current) {
                            case 'left':
                                leftBelow.push(node);
                                break;
                            case 'right':
                                rightBelow.push(node);
                                break;
                            default:
                                inlineBelow.push(node);
                                break;
                        }
                    }
                }
            }
            if (leftAbove.length && leftBelow.length) {
                leftSub = [leftAbove, leftBelow];
                if (leftBelow.length > 1) {
                    leftBelow[0].alignmentType |= NODE_ALIGNMENT.EXTENDABLE;
                }
            }
            else if (leftAbove.length) {
                leftSub = leftAbove;
            }
            else if (leftBelow.length) {
                leftSub = leftBelow;
            }
            if (rightAbove.length && rightBelow.length) {
                rightSub = [rightAbove, rightBelow];
                if (rightBelow.length > 1) {
                    rightBelow[0].alignmentType |= NODE_ALIGNMENT.EXTENDABLE;
                }
            }
            else if (rightAbove.length) {
                rightSub = rightAbove;
            }
            else if (rightBelow.length) {
                rightSub = rightBelow;
            }
            const alignmentType = NODE_ALIGNMENT.FLOAT | (rightSub.length ? NODE_ALIGNMENT.RIGHT : 0);
            const layoutData = Application.createLayoutData(group, parent, 0, alignmentType);
            if (this.settings.floatOverlapDisabled) {
                layerIndex.push(inlineAbove, [leftAbove, rightAbove], inlineBelow);
                if (parent.linearVertical) {
                    group.alignmentType |= alignmentType;
                    output = formatPlaceholder(group.id);
                    group.render(parent);
                    group.renderDepth--;
                }
                else {
                    layoutData.itemCount = (inlineAbove.length ? 1 : 0) + (leftAbove.length + rightAbove.length ? 1 : 0) + (inlineBelow.length ? 1 : 0);
                    layoutData.containerType = NODE_CONTAINER.LINEAR;
                    layoutData.containerType = NODE_ALIGNMENT.VERTICAL;
                    output = this.renderNode(layoutData);
                }
            }
            else {
                if (inlineAbove.length) {
                    if (rightBelow.length) {
                        leftSub = [inlineAbove, leftAbove];
                        layerIndex.push(leftSub, rightSub);
                    }
                    else if (leftBelow.length) {
                        rightSub = [inlineAbove, rightAbove];
                        layerIndex.push(rightSub, leftSub);
                    }
                    else {
                        layerIndex.push(inlineAbove, leftSub, rightSub);
                    }
                    if (inlineAbove.length > 1) {
                        inlineAbove[0].alignmentType |= NODE_ALIGNMENT.EXTENDABLE;
                    }
                }
                else {
                    if ((leftSub === leftBelow && rightSub === rightAbove) || (leftSub === leftAbove && rightSub === rightBelow)) {
                        if (leftBelow.length === 0) {
                            layerIndex.push([leftAbove, rightBelow]);
                        }
                        else {
                            layerIndex.push([rightAbove, leftBelow]);
                        }
                    }
                    else {
                        layerIndex.push(leftSub, rightSub);
                    }
                }
                layerIndex = layerIndex.filter(item => item && item.length > 0);
                layoutData.itemCount = layerIndex.length;
                if (inlineAbove.length === 0 && (leftSub.length === 0 || rightSub.length === 0)) {
                    layoutData.containerType = NODE_CONTAINER.LINEAR;
                    layoutData.alignmentType |= NODE_ALIGNMENT.VERTICAL;
                    output = this.renderNode(layoutData);
                }
                else {
                    layoutData.containerType = NODE_CONTAINER.FRAME;
                    output = this.renderNode(layoutData);
                }
            }
        }
        if (layerIndex.length) {
            let floatgroup: T | null;
            layerIndex.forEach((item, index) => {
                if (Array.isArray(item[0])) {
                    const grouping: T[] = [];
                    (item as T[][]).forEach(segment => grouping.push(...segment));
                    grouping.sort(NodeList.siblingIndex);
                    floatgroup = this.viewController.createNodeGroup(grouping[0], group, grouping);
                    const layoutData = Application.createLayoutData(
                        floatgroup,
                        group,
                        0,
                        NODE_ALIGNMENT.FLOAT | ((item as T[][]).some(segment => segment === rightSub || segment === rightAbove) ? NODE_ALIGNMENT.RIGHT : 0),
                        item.length
                    );
                    if (this.settings.floatOverlapDisabled) {
                        layoutData.containerType = NODE_CONTAINER.FRAME;
                    }
                    else {
                        if (group.linearVertical) {
                            floatgroup = group;
                        }
                        else {
                            layoutData.containerType = NODE_CONTAINER.LINEAR;
                            layoutData.alignmentType |= NODE_ALIGNMENT.VERTICAL;
                        }
                    }
                    if (layoutData.containerType !== 0) {
                        output = replacePlaceholder(output, group.id, this.renderNode(layoutData));
                    }
                }
                else {
                    floatgroup = null;
                }
                ((Array.isArray(item[0]) ? item : [item]) as T[][]).forEach(segment => {
                    let basegroup = group;
                    if (floatgroup && [inlineAbove, leftAbove, leftBelow, rightAbove, rightBelow].includes(segment)) {
                        basegroup = floatgroup;
                    }
                    if (segment.length > 1) {
                        const subgroup = this.viewController.createNodeGroup(segment[0], basegroup, segment);
                        const layoutData = Application.createLayoutData(
                            subgroup,
                            basegroup,
                            0,
                            NODE_ALIGNMENT.SEGMENTED,
                            segment.length,
                            segment
                        );
                        const floated = NodeList.floated(segment);
                        if (floated.size > 0) {
                            layoutData.alignmentType |= NODE_ALIGNMENT.FLOAT | (floated.has('right') ? NODE_ALIGNMENT.RIGHT : 0);
                        }
                        if (Application.relativeHorizontal(segment, cleared)) {
                            layoutData.containerType = NODE_CONTAINER.RELATIVE;
                            if (floated.size === 0) {
                                layoutData.alignmentType |= NODE_ALIGNMENT.HORIZONTAL;
                            }
                        }
                        else {
                            layoutData.containerType = NODE_CONTAINER.LINEAR;
                            layoutData.alignmentType |= NodeList.linearX(segment) ? NODE_ALIGNMENT.HORIZONTAL : NODE_ALIGNMENT.VERTICAL;
                            if (floated.has('right') && subgroup.some(node => node.marginLeft < 0)) {
                                const sorted: T[] = [];
                                let marginRight = 0;
                                subgroup.duplicate().forEach((node: T) => {
                                    let prepend = false;
                                    if (marginRight < 0) {
                                        if (Math.abs(marginRight) > node.bounds.width) {
                                            marginRight += node.bounds.width;
                                            node.modifyBox(BOX_STANDARD.MARGIN_RIGHT, node.bounds.width * -1, true);
                                            prepend = true;
                                        }
                                        else {
                                            if (Math.abs(marginRight) >= node.marginRight) {
                                                node.modifyBox(BOX_STANDARD.MARGIN_RIGHT, Math.ceil(Math.abs(marginRight) - node.marginRight));
                                                node.modifyBox(BOX_STANDARD.MARGIN_RIGHT, null);
                                            }
                                            else {
                                                node.modifyBox(BOX_STANDARD.MARGIN_RIGHT, marginRight, true);
                                            }
                                        }
                                    }
                                    if (node.marginLeft < 0) {
                                        marginRight += Math.max(node.marginLeft, node.bounds.width * -1);
                                        node.modifyBox(BOX_STANDARD.MARGIN_LEFT, null);
                                    }
                                    if (prepend) {
                                        sorted.splice(sorted.length - 1, 0, node);
                                    }
                                    else {
                                        sorted.push(node);
                                    }
                                });
                                subgroup.replace(sorted.reverse());
                                this.preserveRenderPosition(subgroup);
                            }
                        }
                        output = replacePlaceholder(output, basegroup.id, this.renderNode(layoutData));
                        basegroup.appendRendered(subgroup);
                    }
                    else if (segment.length) {
                        const single = segment[0];
                        single.alignmentType |= NODE_ALIGNMENT.SINGLE | (single.float === 'right' ? NODE_ALIGNMENT.RIGHT : 0);
                        single.renderPosition = index;
                        output = replacePlaceholder(output, basegroup.id, `{:${basegroup.id}:${index}}`);
                        basegroup.appendRendered(single);
                    }
                });
            });
        }
        return output;
    }

    protected processLayoutVertical(group: T | undefined, parent: T, nodes: T[], cleared: Map<T, string>) {
        let output = '';
        if (group) {
            const layoutData = Application.createLayoutData(
                group,
                parent,
                NODE_CONTAINER.LINEAR,
                NODE_ALIGNMENT.VERTICAL,
                nodes.length
            );
            output = this.renderNode(layoutData);
        }
        else {
            group = parent;
            output = formatPlaceholder(group.id);
        }
        const staticRows: T[][] = [];
        const floatedRows: T[][] = [];
        const current: T[] = [];
        const floated: T[] = [];
        let leadingMargin = 0;
        let clearReset = false;
        let linearVertical = true;
        nodes.some(node => {
            if (!node.floating) {
                leadingMargin += node.linear.height;
                return true;
            }
            return false;
        });
        for (const node of nodes) {
            if (cleared.has(node)) {
                if (!node.floating) {
                    node.modifyBox(BOX_STANDARD.MARGIN_TOP, null);
                    staticRows.push(current.slice());
                    current.length = 0;
                    floatedRows.push(floated.slice());
                    floated.length = 0;
                }
                else {
                    clearReset = true;
                }
            }
            if (node.floating) {
                floated.push(node);
            }
            else {
                if (clearReset && !cleared.has(node)) {
                    linearVertical = false;
                }
                current.push(node);
            }
        }
        if (floated.length) {
            floatedRows.push(floated);
        }
        if (current.length) {
            staticRows.push(current);
        }
        if (!linearVertical) {
            let content = '';
            for (let i = 0; i < Math.max(floatedRows.length, staticRows.length); i++) {
                const floating = floatedRows[i] || [];
                const pageflow = staticRows[i] || [];
                if (pageflow.length || floating.length) {
                    const basegroup = this.viewController.createNodeGroup(floating[0] || pageflow[0], group, []);
                    const children: T[] = [];
                    let subgroup: T | undefined;
                    let alignmentType = 0;
                    if (floating.length > 1) {
                        subgroup = this.viewController.createNodeGroup(floating[0], basegroup, floating);
                        alignmentType |= NODE_ALIGNMENT.FLOAT;
                    }
                    else if (floating.length) {
                        subgroup = floating[0];
                        subgroup.parent = basegroup;
                        alignmentType |= NODE_ALIGNMENT.FLOAT;
                    }
                    if (subgroup) {
                        children.push(subgroup);
                        if (i === 0 && leadingMargin > 0) {
                            subgroup.modifyBox(BOX_STANDARD.MARGIN_TOP, leadingMargin);
                        }
                        subgroup = undefined;
                    }
                    if (pageflow.length > 1) {
                        subgroup = this.viewController.createNodeGroup(pageflow[0], basegroup, pageflow);
                    }
                    else if (pageflow.length) {
                        subgroup = pageflow[0];
                        subgroup.parent = basegroup;
                    }
                    if (subgroup) {
                        children.push(subgroup);
                    }
                    basegroup.init();
                    const layoutData = Application.createLayoutData(
                        basegroup,
                        group,
                        NODE_CONTAINER.FRAME,
                        NODE_ALIGNMENT.VERTICAL | alignmentType,
                        children.length,
                        children
                    );
                    content += this.renderNode(layoutData);
                    children.forEach((node, index) => {
                        if (nodes.includes(node)) {
                            content = replacePlaceholder(content, basegroup.id, `{:${basegroup.id}:${index}}`);
                        }
                        else {
                            const childData = Application.createLayoutData(
                                node,
                                basegroup,
                                NODE_CONTAINER.LINEAR,
                                NODE_ALIGNMENT.VERTICAL | NODE_ALIGNMENT.SEGMENTED | (node.some(item => item.floating) ? NODE_ALIGNMENT.FLOAT : 0),
                                node.length,
                                node.children as T[]
                            );
                            content = replacePlaceholder(content, basegroup.id, this.renderNode(childData));
                        }
                    });
                }
            }
            output = replacePlaceholder(output, group.id, content);
        }
        return output;
    }

    protected processRenderQueue() {
        const template: StringMap = {};
        for (const [id, templates] of this.session.renderQueue.entries()) {
            const [controlId] = id.split(':');
            let replaceId = controlId;
            if (!isNumber(replaceId)) {
                const target = Node.getNodeFromElement(document.getElementById(replaceId));
                if (target) {
                    replaceId = target.id.toString();
                }
            }
            let output = templates.join('\n');
            if (replaceId !== controlId) {
                const target = this.session.cache.find('id', parseInt(replaceId));
                if (target) {
                    const depth = target.renderDepth + 1;
                    output = replaceIndent(output, depth);
                    const pattern = /{@(\d+)}/g;
                    let match: RegExpExecArray | null;
                    let i = 0;
                    while ((match = pattern.exec(output)) !== null) {
                        const node = this.session.cache.find('id', parseInt(match[1]));
                        if (node) {
                            if (i++ === 0) {
                                node.renderDepth = depth;
                            }
                            else {
                                node.renderDepth = node.parent.renderDepth + 1;
                            }
                        }
                    }
                }
            }
            template[replaceId] = output;
        }
        for (const inner in template) {
            for (const outer in template) {
                if (inner !== outer) {
                    template[inner] = template[inner].replace(formatPlaceholder(outer), template[outer]);
                    template[outer] = template[outer].replace(formatPlaceholder(inner), template[inner]);
                }
            }
        }
        for (const value of this.layouts) {
            for (const id in template) {
                value.content = value.content.replace(formatPlaceholder(id), template[id]);
            }
            value.content = this.viewController.replaceRenderQueue(value.content);
        }
    }

    private setStyleMap() {
        let warning = false;
        const dpi = this.settings.resolutionDPI;
        const clientFirefox = isUserAgent(USER_AGENT.FIREFOX);
        for (let i = 0; i < document.styleSheets.length; i++) {
            const styleSheet = <CSSStyleSheet> document.styleSheets[i];
            if (styleSheet.cssRules) {
                for (let j = 0; j < styleSheet.cssRules.length; j++) {
                    try {
                        if (styleSheet.cssRules[j] instanceof CSSStyleRule) {
                            const cssRule = <CSSStyleRule> styleSheet.cssRules[j];
                            const attrRule = new Set<string>();
                            Array.from(cssRule.style).forEach(value => attrRule.add(convertCamelCase(value)));
                            Array.from(document.querySelectorAll(cssRule.selectorText)).forEach((element: HTMLElement) => {
                                const attrs = new Set(attrRule);
                                Array.from(element.style).forEach(value => attrs.add(convertCamelCase(value)));
                                const style = getStyle(element);
                                const fontSize = parseInt(convertPX(style.fontSize || '16px', dpi, 0));
                                const styleMap: StringMap = {};
                                for (const attr of attrs) {
                                    if (element.style[attr]) {
                                        styleMap[attr] = element.style[attr];
                                    }
                                    else {
                                        const value: string = cssRule.style[attr];
                                        if (value !== 'initial') {
                                            if (style[attr] === value) {
                                                styleMap[attr] = style[attr];
                                            }
                                            else {
                                                switch (attr) {
                                                    case 'backgroundColor':
                                                    case 'borderTopColor':
                                                    case 'borderRightColor':
                                                    case 'borderBottomColor':
                                                    case 'borderLeftColor':
                                                    case 'color':
                                                    case 'fontSize':
                                                    case 'fontWeight':
                                                        styleMap[attr] = style[attr] || value;
                                                        break;
                                                    case 'width':
                                                    case 'height':
                                                    case 'minWidth':
                                                    case 'maxWidth':
                                                    case 'minHeight':
                                                    case 'maxHeight':
                                                    case 'lineHeight':
                                                    case 'verticalAlign':
                                                    case 'textIndent':
                                                    case 'columnGap':
                                                    case 'top':
                                                    case 'right':
                                                    case 'bottom':
                                                    case 'left':
                                                    case 'marginTop':
                                                    case 'marginRight':
                                                    case 'marginBottom':
                                                    case 'marginLeft':
                                                    case 'paddingTop':
                                                    case 'paddingRight':
                                                    case 'paddingBottom':
                                                    case 'paddingLeft':
                                                        styleMap[attr] = /^[A-Za-z\-]+$/.test(value) || isPercent(value) ? value : convertPX(value, dpi, fontSize);
                                                        break;
                                                    default:
                                                        if (styleMap[attr] === undefined) {
                                                            styleMap[attr] = value;
                                                        }
                                                        break;
                                                }
                                            }
                                        }
                                    }
                                }
                                if (this.settings.preloadImages && hasValue(styleMap.backgroundImage) && styleMap.backgroundImage !== 'initial') {
                                    styleMap.backgroundImage.split(',')
                                        .map((value: string) => value.trim())
                                        .forEach(value => {
                                            const uri = cssResolveUrl(value);
                                            if (uri !== '' && !this.session.image.has(uri)) {
                                                this.session.image.set(uri, { width: 0, height: 0, uri });
                                            }
                                        });
                                }
                                if (clientFirefox && styleMap.display === undefined) {
                                    switch (element.tagName) {
                                        case 'INPUT':
                                        case 'TEXTAREA':
                                        case 'SELECT':
                                        case 'BUTTON':
                                            styleMap.display = 'inline-block';
                                            break;
                                    }
                                }
                                const data = getElementCache(element, 'styleMap');
                                if (data) {
                                    Object.assign(data, styleMap);
                                }
                                else {
                                    setElementCache(element, 'style', style);
                                    setElementCache(element, 'styleMap', styleMap);
                                }
                            });
                        }
                    }
                    catch (error) {
                        if (!warning) {
                            alert('External CSS files cannot be parsed with Chrome 64+ when loading HTML pages directly from your hard drive [file://]. ' +
                                  'Either use a local web server [http://], embed your CSS into a &lt;style&gt; element, or use a different browser. ' +
                                  'See the README for more detailed instructions.\n\n' +
                                  `${styleSheet.href}\n\n${error}`);
                            warning = true;
                        }
                    }
                }
            }
        }
    }

    set appName(value) {
        if (this.resourceHandler) {
            this.resourceHandler.fileHandler.appName = value;
        }
    }
    get appName() {
        return this.resourceHandler ? this.resourceHandler.fileHandler.appName : '';
    }

    set settings(value) {
        if (typeof value !== 'object') {
            value = {} as Settings;
        }
        this._settings = value;
        if (this.viewController) {
            this.viewController.settings = value;
        }
        if (this.resourceHandler) {
            this.resourceHandler.settings = value;
        }
    }
    get settings() {
        return this._settings;
    }

    get layouts() {
        return [...this._views, ...this._includes];
    }

    get viewData(): ViewData<NodeList<T>> {
        return {
            cache: this.session.cache,
            views: this._views,
            includes: this._includes
        };
    }

    get size() {
        return this._views.length + this._includes.length;
    }
}