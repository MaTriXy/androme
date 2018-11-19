import { NODE_ALIGNMENT, NODE_STANDARD, USER_AGENT } from '../lib/enumeration';

import Container from './container';
import Node from './node';

import { isUserAgent } from '../lib/dom';
import { convertInt, hasBit, partition } from '../lib/util';

function getDocumentParent<T extends Node>(nodes: T[]) {
    for (const node of nodes) {
        if (!node.companion && node.domElement) {
            return node.documentParent;
        }
    }
    return nodes[0].documentParent;
}

export default class NodeList<T extends Node> extends Container<T> implements androme.lib.base.NodeList<T> {
    public static outerRegion<T extends Node>(list: T[], dimension = 'linear') {
        let top: T[] = [];
        let right: T[] = [];
        let bottom: T[] = [];
        let left: T[] = [];
        const nodes = list.slice();
        list.forEach(node => node.companion && nodes.push(node.companion as T));
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (i === 0) {
                top.push(node);
                right.push(node);
                bottom.push(node);
                left.push(node);
            }
            else {
                if (top[0][dimension].top === node[dimension].top) {
                    top.push(node);
                }
                else if (node[dimension].top < top[0][dimension].top) {
                    top = [node];
                }
                if (right[0][dimension].right === node[dimension].right) {
                    right.push(node);
                }
                else if (node[dimension].right > right[0][dimension].right) {
                    right = [node];
                }
                if (bottom[0][dimension].bottom === node[dimension].bottom) {
                    bottom.push(node);
                }
                else if (node[dimension].bottom > bottom[0][dimension].bottom) {
                    bottom = [node];
                }
                if (left[0][dimension].left === node[dimension].left) {
                    left.push(node);
                }
                else if (node[dimension].left < left[0][dimension].left) {
                    left = [node];
                }
            }
        }
        return { top, right, bottom, left };
    }

    public static floated<T extends Node>(list: T[]) {
        return new Set(list.map(node => node.float).filter(value => value !== 'none'));
    }

    public static cleared<T extends Node>(list: T[]) {
        const result = new Map<T, string>();
        const floated = new Set<string>();
        for (const node of list) {
            if (node.siblingflow) {
                const clear = node.css('clear');
                if (floated.size > 0) {
                    if (clear === 'both') {
                        result.set(node, floated.size === 2 ? 'both' : floated.values().next().value);
                        floated.clear();
                    }
                    else if (floated.has(clear)) {
                        floated.delete(clear);
                        result.set(node, clear);
                    }
                }
                if (node.floating) {
                    floated.add(node.float);
                }
            }
        }
        return result;
    }

    public static textBaseline<T extends Node>(list: T[]) {
        let baseline: T[] = [];
        if (!list.some(node => (node.textElement || node.imageElement) && node.baseline)) {
            baseline = list.filter(node => node.baseline).sort((a, b) => {
                let nodeTypeA = a.nodeType;
                let nodeTypeB = b.nodeType;
                if (a.layoutHorizontal) {
                    nodeTypeA = Math.min.apply(null, a.map(item => item.nodeType > 0 ? item.nodeType : NODE_STANDARD.INLINE));
                }
                if (b.layoutHorizontal) {
                    nodeTypeB = Math.min.apply(null, b.map(item => item.nodeType > 0 ? item.nodeType : NODE_STANDARD.INLINE));
                }
                return nodeTypeA === nodeTypeB ? (a.id < b.id ? -1 : 1) : (nodeTypeA < nodeTypeB ? -1 : 1);
            });
        }
        else {
            const lineHeight: number = Math.max.apply(null, list.map(node => node.lineHeight));
            const boundsHeight: number = Math.max.apply(null, list.map(node => node.bounds.height));
            if (lineHeight > boundsHeight) {
                const result = list.filter(node => node.lineHeight === lineHeight);
                return (result.length === list.length ? result.filter(node => node.htmlElement) : result).filter(node => node.baseline);
            }
            baseline = list.filter(node => node.baselineInside).sort((a, b) => {
                let heightA = a.bounds.height;
                let heightB = b.bounds.height;
                if (isUserAgent(USER_AGENT.EDGE)) {
                    if (a.textElement) {
                        heightA = Math.max(Math.floor(heightA), a.lineHeight);
                    }
                    if (b.textElement) {
                        heightB = Math.max(Math.floor(heightB), b.lineHeight);
                    }
                }
                if (!a.imageElement || !b.imageElement) {
                    const fontSizeA = convertInt(a.css('fontSize'));
                    const fontSizeB = convertInt(b.css('fontSize'));
                    if (a.multiLine || b.multiLine) {
                        if (a.lineHeight > 0 && b.lineHeight > 0) {
                            return a.lineHeight <= b.lineHeight ? 1 : -1;
                        }
                        else if (fontSizeA === fontSizeB) {
                            return a.htmlElement || !b.htmlElement ? -1 : 1;
                        }
                    }
                    if (a.nodeType !== b.nodeType && (a.nodeType < NODE_STANDARD.TEXT || b.nodeType < NODE_STANDARD.TEXT)) {
                        if (a.textElement || a.imageElement) {
                            return -1;
                        }
                        else if (b.textElement || b.imageElement) {
                            return 1;
                        }
                        return a.nodeType < b.nodeType ? -1 : 1;
                    }
                    else if ((a.lineHeight > heightB && b.lineHeight === 0) || b.imageElement) {
                        return -1;
                    }
                    else if ((b.lineHeight > heightA && a.lineHeight === 0) || a.imageElement) {
                        return 1;
                    }
                    else {
                        if (fontSizeA === fontSizeB && heightA === heightB) {
                            if (a.htmlElement && !b.htmlElement) {
                                return -1;
                            }
                            else if (!a.htmlElement && b.htmlElement) {
                                return 1;
                            }
                            else {
                                return a.siblingIndex >= b.siblingIndex ? 1 : -1;
                            }
                        }
                        else if (fontSizeA !== fontSizeB && fontSizeA !== 0 && fontSizeB !== 0) {
                            return fontSizeA > fontSizeB ? -1 : 1;
                        }
                    }
                }
                return heightA <= heightB ? 1 : -1;
            });
        }
        let fontFamily: string;
        let fontSize: string;
        let fontWeight: string;
        return baseline.filter((node, index) => {
            if (index === 0) {
                fontFamily = node.css('fontFamily');
                fontSize = node.css('fontSize');
                fontWeight = node.css('fontWeight');
                return true;
            }
            else {
                return (
                    node.css('fontFamily') === fontFamily &&
                    node.css('fontSize') === fontSize &&
                    node.css('fontWeight') === fontWeight &&
                    node.nodeName === baseline[0].nodeName && (
                        (node.lineHeight > 0 && node.lineHeight === baseline[0].lineHeight) ||
                        node.bounds.height === baseline[0].bounds.height
                    )
                );
            }
        });
    }

    public static linearX<T extends Node>(list: T[], traverse = true) {
        const nodes = list.filter(node => node.pageflow);
        switch (nodes.length) {
            case 0:
                return false;
            case 1:
                return true;
            default:
                const parent = getDocumentParent(nodes);
                let horizontal = false;
                if (traverse) {
                    if (nodes.every(node => node.documentParent === parent || (!!node.companion && node.companion.documentParent === parent))) {
                        const result = NodeList.clearedSiblings(parent);
                        horizontal = nodes.slice().sort(NodeList.siblingIndex).every((node, index) => {
                            if (index > 0) {
                                if (node.companion && node.companion.documentParent === parent) {
                                    node = node.companion as T;
                                }
                                return !node.alignedVertically(node.previousSibling(), result);
                            }
                            return true;
                        });
                    }
                }
                if (horizontal || !traverse) {
                    return nodes.every(node => !nodes.some(sibling => sibling !== node && node.linear.top >= sibling.linear.bottom && node.intersectY(sibling.linear)));
                }
                return false;
        }
    }

    public static linearY<T extends Node>(list: T[]) {
        const nodes = list.filter(node => node.pageflow);
        switch (nodes.length) {
            case 0:
                return false;
            case 1:
                return true;
            default:
                const parent = getDocumentParent(nodes);
                if (nodes.every(node => node.documentParent === parent || (!!node.companion && node.companion.documentParent === parent))) {
                    const result = NodeList.clearedSiblings(parent);
                    return nodes.slice().sort(NodeList.siblingIndex).every((node, index) => {
                        if (index > 0 && !node.lineBreak) {
                            if (node.companion && node.companion.documentParent === parent) {
                                node = node.companion as T;
                            }
                            return node.alignedVertically(node.previousSibling(), result);
                        }
                        return true;
                    });
                }
                return false;
        }
    }

    public static sortByAlignment<T extends Node>(list: T[], alignmentType = NODE_ALIGNMENT.NONE, parent?: T) {
        let sorted = false;
        if (parent && alignmentType === NODE_ALIGNMENT.NONE) {
            if (parent.linearHorizontal) {
                alignmentType |= NODE_ALIGNMENT.HORIZONTAL;
            }
            else if (parent.layoutConstraint && list.some(node => !node.pageflow)) {
                alignmentType |= NODE_ALIGNMENT.ABSOLUTE;
            }
        }
        if (hasBit(alignmentType, NODE_ALIGNMENT.HORIZONTAL)) {
            if (list.some(node => node.floating)) {
                list.sort((a, b) => {
                    if (a.floating && !b.floating) {
                        return a.float === 'left' ? -1 : 1;
                    }
                    else if (!a.floating && b.floating) {
                        return b.float === 'left' ? 1 : -1;
                    }
                    else if (a.floating && b.floating) {
                        if (a.float !== b.float) {
                            return a.float === 'left' ? -1 : 1;
                        }
                    }
                    return a.linear.left >= b.linear.left ? 1 : -1;
                });
                sorted = true;
            }
        }
        if (hasBit(alignmentType, NODE_ALIGNMENT.ABSOLUTE)) {
            if (list.some(node => node.toInt('zIndex') !== 0)) {
                list.sort((a, b) => {
                    const indexA = a.toInt('zIndex');
                    const indexB = b.toInt('zIndex');
                    if (indexA === 0 && indexB === 0) {
                        return a.siblingIndex >= b.siblingIndex ? 1 : -1;
                    }
                    return indexA >= indexB ? 1 : -1;
                });
                sorted = true;
            }
        }
        return sorted;
    }

    public static siblingIndex<T extends Node>(a: T, b: T) {
        return a.siblingIndex >= b.siblingIndex ? 1 : -1;
    }

    private static clearedSiblings<T extends Node>(parent: T): Map<T, string> {
        return this.cleared(Array.from(parent.baseElement.children).map(element => Node.getNodeFromElement(element) as T).filter(node => node));
    }

    public delegateAppend?: (node: T) => void;

    private _currentId = 0;

    constructor(children?: T[]) {
        super(children);
    }

    public append(node: T, delegate = true) {
        super.append(node);
        if (delegate && this.delegateAppend) {
            this.delegateAppend.call(this, node);
        }
        return this;
    }

    public reset() {
        this._currentId = 0;
        this.clear();
        return this;
    }

    public partition(predicate: (value: T) => boolean) {
        const [valid, invalid]: T[][] = partition(this.children, predicate);
        return [new NodeList(valid), new NodeList(invalid)];
    }

    get visible() {
        return this.children.filter(node => node.visible);
    }

    get elements() {
        return this.children.filter(node => node.visible && node.styleElement);
    }

    get nextId() {
        return ++this._currentId;
    }

    get linearX() {
        return NodeList.linearX(this.children);
    }
    get linearY() {
        return NodeList.linearY(this.children);
    }
}