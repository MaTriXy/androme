export {};

type T = androme.lib.base.Node;

declare global {
    namespace androme.lib.base {
        export class Node implements BoxModel {
            public id: number;
            public style: CSSStyleDeclaration;
            public styleMap: StringMap;
            public nodeId: string;
            public nodeType: number;
            public alignmentType: number;
            public depth: number;
            public siblingIndex: number;
            public renderIndex: number;
            public renderPosition: number;
            public box: BoxDimensionsRect;
            public bounds: BoxDimensionsRect;
            public linear: BoxDimensionsRect;
            public excludeSection: number;
            public excludeProcedure: number;
            public excludeResource: number;
            public renderExtension: Set<any>;
            public companion: T;
            public documentRoot: boolean;
            public auto: boolean;
            public visible: boolean;
            public excluded: boolean;
            public rendered: boolean;
            public children: any[];
            public constraint: ObjectMap<any>;
            public readonly initial: InitialValues<T>;
            public readonly renderChildren: any[];
            public readonly documentParent: T;
            public readonly linearHorizontal: boolean;
            public readonly linearVertical: boolean;
            public readonly layoutHorizontal: boolean;
            public readonly layoutVertical: boolean;
            public readonly inlineWidth: boolean;
            public readonly inlineHeight: boolean;
            public readonly blockWidth: boolean;
            public readonly blockHeight: boolean;
            public readonly baseElement: Element;
            public readonly tagName: string;
            public readonly hasElement: boolean;
            public readonly domElement: boolean;
            public readonly documentBody: boolean;
            public readonly dataset: DOMStringMap;
            public readonly extension: string;
            public readonly flex: Flexbox;
            public readonly viewWidth: number;
            public readonly viewHeight: number;
            public readonly hasWidth: boolean;
            public readonly hasHeight: boolean;
            public readonly lineHeight: number;
            public readonly display: string;
            public readonly position: string;
            public readonly top: number | null;
            public readonly right: number | null;
            public readonly bottom: number | null;
            public readonly left: number | null;
            public readonly marginTop: number;
            public readonly marginRight: number;
            public readonly marginBottom: number;
            public readonly marginLeft: number;
            public readonly borderTopWidth: number;
            public readonly borderRightWidth: number;
            public readonly borderBottomWidth: number;
            public readonly borderLeftWidth: number;
            public readonly paddingTop: number;
            public readonly paddingRight: number;
            public readonly paddingBottom: number;
            public readonly paddingLeft: number;
            public readonly siblingflow: boolean;
            public readonly inline: boolean;
            public readonly inlineElement: boolean;
            public readonly inlineStatic: boolean;
            public readonly inlineText: boolean;
            public readonly plainText: boolean;
            public readonly imageElement: boolean;
            public readonly lineBreak: boolean;
            public readonly textElement: boolean;
            public readonly block: boolean;
            public readonly blockStatic: boolean;
            public readonly alignOrigin: boolean;
            public readonly alignNegative: boolean;
            public readonly autoMargin: boolean;
            public readonly autoMarginLeft: boolean;
            public readonly autoMarginRight: boolean;
            public readonly autoMarginHorizontal: boolean;
            public readonly autoMarginVertical: boolean;
            public readonly floating: boolean;
            public readonly float: string;
            public readonly textContent: string;
            public readonly overflowX: boolean;
            public readonly overflowY: boolean;
            public readonly baseline: boolean;
            public readonly baselineInside: boolean;
            public readonly preserveWhiteSpace: boolean;
            public readonly actualHeight: number;
            public readonly singleChild: boolean;
            public readonly dir: string;
            public readonly nodes: any[];
            public readonly length: number;
            public readonly previousElementSibling: Element | null;
            public readonly nextElementSibling: Element | null;
            public readonly firstElementChild: Element | null;
            public readonly lastElementChild: Element | null;
            public readonly center: Point;
            public parent: T;
            public controlName: string;
            public renderParent: T;
            public nodeName: string;
            public element: Element;
            public renderAs: T;
            public renderDepth: number;
            public pageflow: boolean;
            public multiLine: boolean;
            public setNodeType(viewName: string): void;
            public setLayout(): void;
            public setAlignment(settings: Settings): void;
            public setBoxSpacing(settings: Settings): void;
            public applyOptimizations(settings: Settings): void;
            public applyCustomizations(settings: Settings): void;
            public modifyBox(region: number | string, offset: number | null, negative?: boolean): void;
            public valueBox(region: number): string[];
            public clone(id?: number, children?: boolean): T;
            public init(): void;
            public is(...views: number[]): boolean;
            public of(nodeType: number, ...alignmentType: number[]): boolean;
            public attr(obj: string, attr: string, value?: string, overwrite?: boolean): string;
            public get(obj: string): StringMap;
            public delete(obj: string, ...attrs: string[]): void;
            public apply(options: {}): void;
            public each(predicate: (value: T, index?: number) => void, rendered?: boolean): this;
            public render(parent: T): void;
            public hide(): void;
            public data(obj: string, attr: string, value?: any, overwrite?: boolean): any;
            public ascend(generated?: boolean, levels?: number): T[];
            public cascade(): T[];
            public inherit(node: T, ...props: string[]): void;
            public alignedVertically(previous: T, cleared?: Map<any, string>, firstNode?: boolean): boolean;
            public intersect(rect: BoxDimensionsRect, dimension?: string): boolean;
            public intersectX(rect: BoxDimensionsRect, dimension?: string): boolean;
            public intersectY(rect: BoxDimensionsRect, dimension?: string): boolean;
            public withinX(rect: BoxDimensionsRect, dimension?: string): boolean;
            public withinY(rect: BoxDimensionsRect, dimension?: string): boolean;
            public outsideX(rect: BoxDimensionsRect, dimension?: string): boolean;
            public outsideY(rect: BoxDimensionsRect, dimension?: string): boolean;
            public css(attr: string | object, value?: string): string;
            public cssInitial(attr: string, complete?: boolean): string;
            public cssParent(attr: string, startChild?: boolean, ignoreHidden?: boolean): string;
            public has(attr: string, checkType?: number, options?: ObjectMap<any>): boolean;
            public isSet(obj: string, attr: string): boolean;
            public hasBit(attr: string, value: number): boolean;
            public toInt(attr: string, defaultValue?: number, options?: StringMap): number;
            public hasAlign(value: number): boolean;
            public setExclusions(): void;
            public setBounds(calibrate?: boolean): void;
            public setDimensions(region?: string[]): void;
            public setMultiLine(): void;
            public getParentElementAsNode(negative?: boolean, containerDefault?: T): Null<T>;
            public remove(node: T): void;
            public renderAppend(node: T): void;
            public resetBox(region: number, node?: T, negative?: boolean): void;
            public removeElement(): void;
            public previousSibling(pageflow?: boolean, lineBreak?: boolean, excluded?: boolean): T | null;
            public nextSibling(pageflow?: boolean, lineBreak?: boolean, excluded?: boolean): T | null;
            public actualLeft(dimension?: string): number;
            public actualRight(dimension?: string): number;
        }
        export class NodeGroup <T extends Node> extends Node {
        }
    }
}