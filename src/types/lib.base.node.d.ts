import { AutoMargin, InitialData, Support, VisibleStyle } from './lib.base.types.node';

declare global {
    namespace androme.lib.base {
        export interface Node extends Container<Node>, BoxModel {
            id: number;
            style: CSSStyleDeclaration;
            containerType: number;
            alignmentType: number;
            depth: number;
            siblingIndex: number;
            renderIndex: number;
            renderPosition: number;
            renderExtension: Set<Extension<Node>>;
            documentRoot: boolean;
            baselineActive: boolean;
            positioned: boolean;
            visible: boolean;
            excluded: boolean;
            rendered: boolean;
            controlId: string;
            companion: Node | undefined;
            readonly localSettings: EnvironmentSettings;
            readonly excludeSection: number;
            readonly excludeProcedure: number;
            readonly excludeResource: number;
            readonly initial: InitialData<Node>;
            readonly renderChildren: Node[];
            readonly box: RectDimensions;
            readonly bounds: RectDimensions;
            readonly linear: RectDimensions;
            readonly element: Element;
            readonly baseElement: Element | null;
            readonly htmlElement: boolean;
            readonly styleElement: boolean;
            readonly imageElement: boolean;
            readonly svgElement: boolean;
            readonly flexElement: boolean;
            readonly gridElement: boolean;
            readonly textElement: boolean;
            readonly tableElement: boolean;
            readonly groupElement: boolean;
            readonly documentBody: boolean;
            readonly dataset: DOMStringMap;
            readonly extension: string;
            readonly flexbox: Flexbox;
            readonly rightAligned: boolean;
            readonly bottomAligned: boolean;
            readonly width: number;
            readonly height: number;
            readonly hasWidth: boolean;
            readonly hasHeight: boolean;
            readonly lineHeight: number;
            readonly display: string;
            readonly position: string;
            readonly positionStatic: boolean;
            readonly positionRelative: boolean;
            readonly positionAuto: boolean;
            readonly top: number;
            readonly right: number;
            readonly bottom: number;
            readonly left: number;
            readonly marginTop: number;
            readonly marginRight: number;
            readonly marginBottom: number;
            readonly marginLeft: number;
            readonly borderTopWidth: number;
            readonly borderRightWidth: number;
            readonly borderBottomWidth: number;
            readonly borderLeftWidth: number;
            readonly paddingTop: number;
            readonly paddingRight: number;
            readonly paddingBottom: number;
            readonly paddingLeft: number;
            readonly contentBoxWidth: number;
            readonly contentBoxHeight: number;
            readonly inlineFlow: boolean;
            readonly inline: boolean;
            readonly inlineStatic: boolean;
            readonly inlineVertical: boolean;
            readonly inlineText: boolean;
            readonly plainText: boolean;
            readonly lineBreak: boolean;
            readonly block: boolean;
            readonly blockStatic: boolean;
            readonly blockDimension: boolean;
            readonly autoMargin: AutoMargin;
            readonly pageFlow: boolean;
            readonly floating: boolean;
            readonly float: string;
            readonly visibleStyle: VisibleStyle;
            readonly textContent: string;
            readonly fontSize: number;
            readonly overflowX: boolean;
            readonly overflowY: boolean;
            readonly baseline: boolean;
            readonly verticalAlign: string;
            readonly preserveWhiteSpace: boolean;
            readonly layoutHorizontal: boolean;
            readonly layoutVertical: boolean;
            readonly inlineWidth: boolean;
            readonly inlineHeight: boolean;
            readonly blockWidth: boolean;
            readonly blockHeight: boolean;
            readonly support: Support;
            readonly absoluteParent: Node | undefined;
            readonly actualParent: Node | undefined;
            readonly actualChildren: Node[];
            readonly actualBoxParent: Node;
            readonly actualHeight: number;
            readonly dir: string;
            readonly nodes: Node[];
            readonly center: Point;
            parent: Node | undefined;
            documentParent: Node;
            renderParent: Node | undefined;
            tagName: string;
            controlName: string;
            renderAs: Node | undefined;
            renderDepth: number;
            multiLine: number;
            overflow: number;
            setControlType(controlName: string, containerType?: number): void;
            setLayout(): void;
            setAlignment(): void;
            applyOptimizations(): void;
            applyCustomizations(): void;
            modifyBox(region: number | string, offset: number | null, negative?: boolean): void;
            valueBox(region: number): [number, number];
            alignParent(position: string): boolean;
            localizeString(value: string): string;
            clone(id?: number, children?: boolean): Node;
            init(): void;
            is(...containers: number[]): boolean;
            of(containerType: number, ...alignmentType: number[]): boolean;
            unsafe(obj: string): any;
            attr(obj: string, attr: string, value?: string, overwrite?: boolean): string;
            namespace(obj: string): StringMap;
            delete(obj: string, ...attrs: string[]): void;
            apply(options: {}): void;
            each(predicate: IteratorPredicate<Node, void>, rendered?: boolean): this;
            render(parent: Node): void;
            hide(): void;
            data(obj: string, attr: string, value?: any, overwrite?: boolean): any;
            unsetCache(...attrs: string[]): void;
            ascend(generated?: boolean, levels?: number): Node[];
            cascade(element?: boolean): Node[];
            inherit(node: Node, ...props: string[]): void;
            alignedVertically(previousSiblings: Node[], siblings?: Node[], cleared?: Map<Node, string>): boolean;
            intersectX(rect: RectDimensions, dimension?: string): boolean;
            intersectY(rect: RectDimensions, dimension?: string): boolean;
            withinX(rect: RectDimensions, dimension?: string): boolean;
            withinY(rect: RectDimensions, dimension?: string): boolean;
            outsideX(rect: RectDimensions, dimension?: string): boolean;
            outsideY(rect: RectDimensions, dimension?: string): boolean;
            css(attr: object | string, value?: string, cache?: boolean): string;
            cssInitial(attr: string, modified?: boolean, computed?: boolean): string;
            cssParent(attr: string, childStart?: boolean, visible?: boolean): string;
            cssTry(attr: string, value: string): boolean;
            cssFinally(attr: string): boolean;
            appendTry(node: Node, withNode: Node, append?: boolean): void;
            toInt(attr: string, initial?: boolean, defaultValue?: number): number;
            convertPX(value: string, horizontal?: boolean, parent?: boolean): string;
            convertPercent(value: string, horizontal: boolean, parent?: boolean): string;
            has(attr: string, checkType?: number, options?: {}): boolean;
            hasBit(attr: string, value: number): boolean;
            hasAlign(value: number): boolean;
            exclude(options: { section?: number, procedure?: number, resource?: number }): void;
            setExclusions(): void;
            setBounds(calibrate?: boolean): void;
            renderChild(node: Node, append?: boolean): void;
            resetBox(region: number, node?: Node, fromParent?: boolean): void;
            inheritBox(region: number, node: Node): void;
            actualRight(dimension?: string): number;
            previousSiblings(lineBreak?: boolean, excluded?: boolean, visible?: boolean): Node[];
            nextSiblings(lineBreak?: boolean, excluded?: boolean, visible?: boolean): Node[];
            firstChild(element?: HTMLElement): Node | undefined;
            lastChild(element?: HTMLElement): Node | undefined;
        }

        export class Node implements Node {}

        export class NodeGroup extends Node {}
    }
}

export {};