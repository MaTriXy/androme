import * as $const from '../lib/constant';
import * as $enum from '../lib/enumeration';

declare global {
    namespace androme.lib {
        namespace constant {
            export import ELEMENT_MAP = $const.ELEMENT_MAP;
            export import ELEMENT_BLOCK = $const.ELEMENT_BLOCK;
            export import ELEMENT_INLINE = $const.ELEMENT_INLINE;
            export import EXT_NAME = $const.EXT_NAME;
            export import REGEX_PATTERN = $const.REGEX_PATTERN;
        }

        namespace enumeration {
            export import APP_FRAMEWORK = $enum.APP_FRAMEWORK;
            export import APP_SECTION = $enum.APP_SECTION;
            export import BOX_STANDARD = $enum.BOX_STANDARD;
            export import CSS_STANDARD = $enum.CSS_STANDARD;
            export import NODE_ALIGNMENT = $enum.NODE_ALIGNMENT;
            export import NODE_PROCEDURE = $enum.NODE_PROCEDURE;
            export import NODE_RESOURCE = $enum.NODE_RESOURCE;
            export import NODE_CONTAINER = $enum.NODE_CONTAINER;
            export import USER_AGENT = $enum.USER_AGENT;
        }

        namespace color {
            export function convertHex(value: string, opacity?: number): string;
            export function getColorByName(value: string): Color | null;
            export function getColorByShade(value: string): Color | null;
            export function convertRGBA(value: string): RGBA | null;
            export function parseRGBA(value: string, opacity?: string): ColorHexAlpha | null;
            export function reduceRGBA(value: string, percent: number): ColorHexAlpha | null;
        }

        namespace dom {
            export function isUserAgent(value: number): boolean;
            export function getDataSet(element: Element, prefix: string): StringMap;
            export function newBoxRect(): BoxRect;
            export function newClientRect(): BoxDimensions;
            export function newBoxModel(): BoxModel;
            export function convertClientUnit(value: string, dimension: number, fontSize?: string | null, percent?: boolean): number;
            export function getRangeClientRect(element: Element): [BoxDimensions, boolean];
            export function assignBounds(bounds: BoxDimensions | DOMRect): BoxDimensions;
            export function getStyle(element: Element | null, cache?: boolean): CSSStyleDeclaration;
            export function getBoxSpacing(element: Element, complete?: boolean, merge?: boolean): BoxModel;
            export function cssResolveUrl(value: string): string;
            export function cssInherit(element: Element, attr: string, exclude?: string[], tagNames?: string[]): string;
            export function cssParent(element: Element, attr: string, ...styles: string[]): boolean;
            export function cssFromParent(element: Element, attr: string): boolean;
            export function cssAttribute(element: Element, attr: string): string;
            export function getBackgroundPosition(value: string, dimension: BoxDimensions, dpi: number, fontSize: number, leftPerspective?: boolean, percent?: boolean): BoxPosition;
            export function getFirstElementChild(elements: Element[]): Element | null;
            export function getLastElementChild(elements: Element[]): Element | null;
            export function hasFreeFormText(element: Element, maxDepth?: number, whiteSpace?: boolean): boolean;
            export function isPlainText(element: Element, whiteSpace?: boolean): boolean;
            export function hasLineBreak(element: Element): boolean;
            export function isLineBreak(element: Element, excluded?: boolean): boolean;
            export function getBetweenElements(firstElement: Element | null, secondElement: Element, cacheNode?: boolean, whiteSpace?: boolean): Element[];
            export function isStyleElement(element: Element): element is HTMLElement;
            export function isElementVisible(element: Element, hideOffScreen: boolean): boolean;
            export function getNestedExtension(element: Element, name: string): HTMLElement | null;
            export function setElementCache(element: Element, attr: string, data: any): void;
            export function getElementCache(element: Element, attr: string): any;
            export function deleteElementCache(element: Element, ...attrs: string[]): void;
            export function getNodeFromElement<T>(element: UndefNull<Element>): T | null;
        }

        namespace svg {
            export function createColorStop(element: SVGGradientElement): ColorStop[];
            export function createTransform(element: SVGGraphicsElement): SvgTransformAttributes;
            export function createTransformOrigin(element: SVGGraphicsElement, dpi: number, fontSize: number): BoxPosition | undefined;
            export function getOffsetX(angle: number, radius: number): number;
            export function getOffsetY(angle: number, radius: number): number;
            export function isSvgVisible(element: SVGGraphicsElement): boolean;
        }

        namespace util {
            export function formatString(value: string, ...params: string[]): string;
            export function convertUnderscore(value: string): string;
            export function convertCamelCase(value: string, char?: string): string;
            export function convertWord(value: string): string;
            export function capitalize(value: string, upper?: boolean): string;
            export function convertInt(value: string | null): number;
            export function convertFloat(value: string | null): number;
            export function convertPX(value: string, dpi: number, fontSize: number): string;
            export function convertPercent(value: number, precision?: number): string;
            export function convertAlpha(value: number): string;
            export function convertRoman(value: number): string;
            export function convertEnum(value: number, base: {}, derived: {}): string;
            export function formatPX(value: any): string;
            export function formatPercent(value: any): string;
            export function hasBit(value: number, type: number): boolean;
            export function isNumber(value: string | number): value is number;
            export function isString(value: any): value is string;
            export function isArray<T>(value: any): value is Array<T>;
            export function isUnit(value: string): boolean;
            export function isPercent(value: string): boolean;
            export function includes(source: string | undefined, value: string, delimiter?: string): boolean;
            export function optional(obj: UndefNull<object>, value: string, type?: string): any;
            export function optionalAsObject(obj: UndefNull<object>, value: string): object;
            export function optionalAsString(obj: UndefNull<object>, value: string): string;
            export function optionalAsNumber(obj: UndefNull<object>, value: string): number;
            export function optionalAsBoolean(obj: UndefNull<object>, value: string): boolean;
            export function resolvePath(value: string): string;
            export function trimNull(value: string | undefined): string;
            export function trimString(value: string | undefined, char: string): string;
            export function trimStart(value: string | undefined, char: string): string;
            export function trimEnd(value: string | undefined, char: string): string;
            export function repeat(many: number, value?: string): string;
            export function indexOf(value: string, ...terms: string[]): number;
            export function lastIndexOf(value: string, char?: string): string;
            export function hasSameValue(obj1: {}, obj2: {}, ...attrs: string[]): boolean;
            export function searchObject(obj: StringMap, value: string | StringMap): any[][];
            export function hasValue(value: any): boolean;
            export function withinRange(a: number, b: number, offset?: number): boolean;
            export function withinFraction(lower: number, upper: number): boolean;
            export function assignWhenNull(source: {}, destination: {}): void;
            export function defaultWhenNull(options: {}, ...attrs: string[]): void;
            export function partition<T>(list: T[], predicate: (value: T) => boolean): [T[], T[]];
            export function sortAsc<T>(list: T[], ...attrs: string[]): T[];
            export function sortDesc<T>(list: T[], ...attrs: string[]): T[];
        }

        namespace xml {
            export function getEnclosingTag(controlName: string, id: number, depth: number, xml?: string, preXml?: string, postXml?: string): string;
            export function formatPlaceholder(id: string | number, symbol?: string): string;
            export function replacePlaceholder(value: string, id: string | number, content: string, before?: boolean): string;
            export function removePlaceholderAll(value: string): string;
            export function replaceIndent(value: string, depth: number): string;
            export function replaceTab(value: string, spaces?: number, preserve?: boolean): string;
            export function replaceEntity(value: string): string;
            export function replaceCharacter(value: string): string;
            export function parseTemplate(value: string): StringMap;
            export function createTemplate(value: StringMap, data: TemplateData, index?: string): string;
            export function getTemplateSection(data: TemplateData, ...levels: string[]): object;
        }
    }
}

export {};