import { IBoxModel, IClientRect } from './types';
import { convertInt } from './util';

export function getRangeBounds(element: HTMLElement) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const domRect = range.getClientRects();
    const bounds = assignBounds(domRect[domRect.length - 1]);
    if (domRect.length > 1) {
        bounds.x = Math.min.apply(null, Array.from(domRect).map((item: any) => item.x));
        bounds.left = (<number> bounds.x);
        bounds.width = Array.from(domRect).reduce((a: number, b: any) => a + b.width, 0);
    }
    return bounds;
}

export function assignBounds(bounds: IClientRect): IClientRect {
    return {
        x: bounds.x,
        y: bounds.y,
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
        left: bounds.left,
        width: bounds.width,
        height: bounds.height
    };
}

export function getStyle(element: HTMLElement) {
    const object = (<any> element);
    return (object.__node != null ? (<CSSStyleDeclaration> object.__node.style) : getComputedStyle(element));
}

export function sameAsParent(element: HTMLElement, attr: string) {
    if (element.parentElement != null) {
        return (getStyle(element)[attr] === getStyle(element.parentElement)[attr]);
    }
    return false;
}

export function getBoxSpacing(element: HTMLElement, complete = false) {
    const result: IBoxModel = {};
    const style = getStyle(element);
    const node = (<any> element).__node;
    ['padding', 'margin'].forEach(border => {
        ['Top', 'Left', 'Right', 'Bottom'].forEach(side => {
            const attr = border + side;
            const value = convertInt((node != null ? node[attr] : style[attr]));
            if (complete || value !== 0) {
                result[attr] = value;
            }
        });
    });
    return result;
}

export function hasFreeFormText(element: HTMLElement) {
    return Array.from(element.childNodes).some(item => (item.nodeName === '#text' && item.textContent != null && item.textContent.trim() !== ''));
}

export function isVisible(element: HTMLElement) {
    switch (element.tagName) {
        case 'BR':
        case 'OPTION':
            return false;
    }
    if (typeof element.getBoundingClientRect === 'function') {
        const bounds = element.getBoundingClientRect();
        if (bounds.width !== 0 && bounds.height !== 0) {
            return true;
        }
        else if (element.children.length > 0) {
            return Array.from(element.children).some((item: HTMLElement) => {
                const style: any = getComputedStyle(item);
                (<any> item).__style = style;
                return (!(style.position === '' || style.position === 'static') || style.float !== 'none');
            });
        }
    }
    return false;
}