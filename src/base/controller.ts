import Node from './node';
import NodeList from './nodelist';
import Application from './application';

export default abstract class Controller<T extends Node> implements androme.lib.base.Controller<T> {
    public cache: NodeList<T>;
    public application: Application<T>;
    public abstract settings: Settings;
    public abstract readonly localSettings: ControllerSettings;

    private _before: ObjectIndex<string[]> = {};
    private _after: ObjectIndex<string[]> = {};

    public abstract createGroup(parent: T, node: T, children: T[]): T;
    public abstract renderGroup(node: T, parent: T, nodeName: number | string, options?: {}): string;
    public abstract renderNode(node: T, parent: T, nodeName: number | string): string;
    public abstract renderNodeStatic(nodeName: number | string, depth: number, options?: {}, width?: string, height?: string, node?: T, children?: boolean): string;
    public abstract renderInclude(node: T, parent: T, name: string): string;
    public abstract renderMerge(name: string, content: string[]): string;
    public abstract renderColumnSpace(depth: number, width?: string, height?: string, columnSpan?: number): string;
    public abstract baseRenderDepth(name: string): number;
    public abstract setConstraints(): void;
    public abstract finalize(viewData: ViewData<NodeList<T>>);
    public abstract get delegateNodeInit(): SelfWrapped<T, void>;

    public reset() {
        this._before = {};
        this._after = {};
    }

    public replaceRenderQueue(output: string) {
        for (const id in this._before) {
            output = output.replace(`{<${id}}`, this._before[id].join(''));
        }
        for (const id in this._after) {
            output = output.replace(`{>${id}}`, this._after[id].join(''));
        }
        return output;
    }

    public prependBefore(id: number, output: string, index = -1) {
        if (this._before[id] === undefined) {
            this._before[id] = [];
        }
        if (index !== -1 && index < this._before[id].length) {
            this._before[id].splice(index, 0, output);
        }
        else {
            this._before[id].push(output);
        }
    }

    public appendAfter(id: number, output: string, index = -1) {
        if (this._after[id] === undefined) {
            this._after[id] = [];
        }
        if (index !== -1 && index < this._after[id].length) {
            this._after[id].splice(index, 0, output);
        }
        else {
            this._after[id].push(output);
        }
    }

    public hasAppendProcessing(id: number) {
        return this._before[id] !== undefined || this._after[id] !== undefined;
    }
}