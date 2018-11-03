import Node from '../base/node';
import Extension from '../base/extension';

import { deleteElementCache, getElementCache, getStyle, setElementCache } from '../lib/dom';

export default abstract class External<T extends Node> extends Extension<T> {
    public beforeInit(init = false) {
        if (this.element && (init || this.included())) {
            if (!getElementCache(this.element, 'andromeExternalDisplay')) {
                const display: string[] = [];
                let current: Null<HTMLElement> = <HTMLElement> this.element;
                while (current) {
                    display.push(getStyle(current).display as string);
                    current.style.display = 'block';
                    current = current.parentElement;
                }
                setElementCache(this.element, 'andromeExternalDisplay', display);
            }
        }
    }

    public init(element: HTMLElement) {
        if (this.included(element)) {
            this.application.viewElements.add(element);
        }
        return false;
    }

    public afterInit(init = false) {
        if (this.element && (init || this.included())) {
            const data = getElementCache(this.element, 'andromeExternalDisplay');
            if (data) {
                const display: string[] = data;
                let current: Null<HTMLElement> = <HTMLElement> this.element;
                let i = 0;
                while (current) {
                    current.style.display = display[i];
                    current = current.parentElement;
                    i++;
                }
                deleteElementCache(this.element, 'andromeExternalDisplay');
            }
        }
    }

    public is() {
        return false;
    }

    public condition() {
        return false;
    }
}