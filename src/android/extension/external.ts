import View from '../view';

export default class <T extends View> extends androme.lib.extensions.External<T> {
    public readonly eventOnly = true;
}