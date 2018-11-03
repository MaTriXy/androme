import View from './view';
import ViewBase from './viewbase';

export default class ViewGroup<T extends View> extends ViewBase(androme.lib.base.NodeGroup) {
    constructor(
        id: number,
        node: T,
        parent: T,
        children: T[],
        afterInit?: SelfWrapped<T, void>)
    {
        super(id, undefined, afterInit);
        this.parent = parent;
        this.depth = node.depth;
        this.nodeName = `${node.nodeName}_GROUP`;
        this.documentParent = node.documentParent;
        this.replace(children);
        if (children.length > 0) {
            this.init();
        }
    }
}