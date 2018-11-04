import { SettingsAndroid } from '../types/local';

import View from '../view';
import ResourceHandler from '../resourcehandler';

export default class <T extends View> extends androme.lib.base.extensions.Custom<T> {
    public afterInsert() {
        const node = this.node as T;
        const options: ExternalData = Object.assign({}, this.options[node.element.id]);
        node.apply(ResourceHandler.formatOptions(options, <SettingsAndroid> this.application.settings));
    }
}