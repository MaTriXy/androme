import { BOX_ANDROID, CONTAINER_ANDROID } from '../lib/constant';
import { CONTAINER_NODE } from '../lib/enumeration';

import View from '../view';

import { createAttribute } from '../lib/util';

import $Layout = androme.lib.base.Layout;

import $const = androme.lib.constant;
import $dom = androme.lib.dom;
import $enum = androme.lib.enumeration;
import $util = androme.lib.util;

function getRowData<T extends View>(mainData: CssGridData<T>, direction: string) {
    const result: Undefined<T[]>[][] = [];
    if (direction === 'column') {
        for (let i = 0; i < mainData.column.count; i++) {
            result[i] = [];
            for (let j = 0; j < mainData.row.count; j++) {
                result[i].push(mainData.rowData[j][i]);
            }
        }
    }
    else {
        for (let i = 0; i < mainData.row.count; i++) {
            result.push(mainData.rowData[i]);
        }
    }
    return result;
}

function getGridSize<T extends View>(mainData: CssGridData<T>, direction: string, node: T) {
    const dimension = direction === 'column' ? 'width' : 'height';
    let result = 0;
    for (let i = 0; i < mainData[direction].count; i++) {
        const unitPX = mainData[direction].unit[i];
        if (unitPX.endsWith('px')) {
            result += parseInt(unitPX);
        }
        else {
            result += $util.minArray(mainData.rowData[i].map(item => item && item.length ? item[0].bounds[dimension] : 0));
        }
    }
    result += (mainData[direction].count - 1) * mainData[direction].gap;
    result = node[dimension] - result;
    return result;
}

export default class <T extends View> extends androme.lib.extensions.CssGrid<T> {
    public processNode(node: T, parent: T): ExtensionResult<T> {
        super.processNode(node, parent);
        const mainData: CssGridData<T> = node.data($const.EXT_NAME.CSS_GRID, 'mainData');
        let output = '';
        if (mainData) {
            const layout = new $Layout(
                parent,
                node,
                CONTAINER_NODE.GRID,
                $enum.NODE_ALIGNMENT.AUTO_LAYOUT,
                node.length,
                node.children as T[]
            );
            layout.rowCount = mainData.row.count;
            layout.columnCount = mainData.column.count;
            output = this.application.renderNode(layout);
        }
        return { output, complete: output !== '' };
    }

    public processChild(node: T, parent: T): ExtensionResult<T> {
        const mainData: CssGridData<T> = parent.data($const.EXT_NAME.CSS_GRID, 'mainData');
        const cellData: CssGridCellData = node.data($const.EXT_NAME.CSS_GRID, 'cellData');
        let output = '';
        let container: T | undefined;
        if (mainData && cellData) {
            function applyLayout(item: T, direction: string, dimension: string) {
                const data = <CssGridDirectionData> mainData[direction];
                const cellStart = `${direction}Start`;
                const cellSpan = `${direction}Span`;
                const cellTotal = cellData[cellSpan] - cellData[cellStart];
                const minDimension = `min${$util.capitalize(dimension)}`;
                let size = 0;
                let minSize = 0;
                let minUnitSize = 0;
                let sizeWeight = 0;
                if (data.unit.every(value => value === 'auto')) {
                    if (dimension === 'width') {
                        data.unit = data.unit.map(() => '1fr');
                    }
                    else {
                        data.unit.length = 0;
                    }
                }
                for (let i = 0, j = 0; i < cellData[cellSpan]; i++) {
                    minUnitSize += parseInt(parent.convertPX(data.unitMin[cellData[cellStart] + i]));
                    let unit = data.unit[cellData[cellStart] + i];
                    if (!$util.hasValue(unit)) {
                        if (data.auto[j]) {
                            unit = data.auto[j];
                            if (data.auto[j + 1]) {
                                j++;
                            }
                        }
                        else {
                            continue;
                        }
                    }
                    if ($util.hasValue(unit)) {
                        if (unit === 'auto' || unit === 'min-content' || unit === 'max-content') {
                            if (cellTotal < data.unit.length && (!parent.has(dimension) || data.unit.some(value => $util.isUnit(value)) || unit === 'min-content')) {
                                size = node.bounds[dimension];
                                minSize = 0;
                                sizeWeight = 0;
                            }
                            else {
                                size = 0;
                                minSize = 0;
                                sizeWeight = 0.01;
                            }
                            break;
                        }
                        else if ($util.isPercent(unit)) {
                            sizeWeight += parseInt(unit) / 100;
                            minSize = size;
                            size = 0;
                        }
                        else if (unit.endsWith('fr')) {
                            sizeWeight += parseInt(unit);
                            minSize = size;
                            size = 0;
                        }
                        else if (unit.endsWith('px')) {
                            const gap = parseInt(unit);
                            if (minSize === 0) {
                                size += gap;
                            }
                            else {
                                minSize += gap;
                            }
                        }
                    }
                }
                if (cellData[cellSpan] > 1) {
                    const value = (cellData[cellSpan] - 1) * data.gap;
                    if (size > 0 && minSize === 0) {
                        size += value;
                    }
                    else if (minSize > 0) {
                        minSize += value;
                    }
                    if (minUnitSize > 0) {
                        minUnitSize += value;
                    }
                }
                if (minUnitSize > 0) {
                    if (data.autoFill && size === 0 && mainData[direction === 'column' ? 'row' : 'column'].count === 1) {
                        size = Math.max(node.bounds.width, minUnitSize);
                        sizeWeight = 0;
                    }
                    else {
                        minSize = minUnitSize;
                    }
                }
                item.android(`layout_${direction}`, cellData[cellStart].toString());
                if (cellData[cellSpan] > 1) {
                    item.android(`layout_${direction}Span`, cellData[cellSpan].toString());
                }
                if (minSize > 0 && !item.has(minDimension)) {
                    item.css(minDimension, $util.formatPX(minSize), true);
                }
                if (sizeWeight > 0) {
                    item.android(`layout_${dimension}`, '0px');
                    item.android(`layout_${direction}Weight`, sizeWeight.toString());
                    item.mergeGravity('layout_gravity', direction === 'column' ? 'fill_horizontal' : 'fill_vertical');
                }
                else if (size > 0 && !item.has(dimension)) {
                    item.css(dimension, $util.formatPX(size), true);
                }
            }
            const alignItems = node.has('alignSelf') ? node.css('alignSelf') : mainData.alignItems;
            const justifyItems = node.has('justifySelf') ? node.css('justifySelf') : mainData.justifyItems;
            if (/(start|end|center|baseline)/.test(alignItems) || /(start|end|center|baseline|left|right)/.test(justifyItems)) {
                container = this.application.createNode($dom.createElement(node.actualParent ? node.actualParent.baseElement : null));
                container.tagName = node.tagName;
                container.setControlType(CONTAINER_ANDROID.FRAME, CONTAINER_NODE.FRAME);
                container.inherit(node, 'initial', 'base');
                container.resetBox($enum.BOX_STANDARD.MARGIN | $enum.BOX_STANDARD.PADDING);
                container.exclude({
                    procedure: $enum.NODE_PROCEDURE.AUTOFIT | $enum.NODE_PROCEDURE.CUSTOMIZATION,
                    resource: $enum.NODE_RESOURCE.BOX_STYLE | $enum.NODE_RESOURCE.ASSET
                });
                parent.appendTry(node, container);
                container.render(parent);
                this.application.processing.cache.append(container, false);
                node.inheritBox($enum.BOX_STANDARD.MARGIN, container);
                applyLayout(container, 'column', 'width');
                applyLayout(container, 'row', 'height');
                let inlineWidth = false;
                if (justifyItems.endsWith('start') || justifyItems.endsWith('left') || justifyItems.endsWith('baseline')) {
                    node.mergeGravity('layout_gravity', 'left');
                    inlineWidth = true;
                }
                else if (justifyItems.endsWith('end') || justifyItems.endsWith('right')) {
                    node.mergeGravity('layout_gravity', 'right');
                    inlineWidth = true;
                }
                else if (justifyItems.endsWith('center')) {
                    node.mergeGravity('layout_gravity', 'center_horizontal');
                    inlineWidth = true;
                }
                if (!node.hasWidth) {
                    node.android('layout_width', inlineWidth ? 'wrap_content' : 'match_parent', false);
                }
                if (alignItems.endsWith('start') || alignItems.endsWith('baseline')) {
                    node.mergeGravity('layout_gravity', 'top');
                }
                else if (alignItems.endsWith('end')) {
                    node.mergeGravity('layout_gravity', 'bottom');
                }
                else if (alignItems.endsWith('center')) {
                    node.mergeGravity('layout_gravity', 'center_vertical');
                }
                else if (!node.hasHeight) {
                    node.android('layout_height', 'match_parent', false);
                }
                node.parent = container;
                const layout = new $Layout(
                    parent,
                    container,
                    CONTAINER_NODE.FRAME,
                    $enum.NODE_ALIGNMENT.SINGLE,
                    1,
                    container.children as T[]
                );
                output = this.application.renderLayout(layout);
            }
            const target = container || node;
            applyLayout(target, 'column', 'width');
            applyLayout(target, 'row', 'height');
            if (!target.has('height')) {
                if (parent.hasHeight) {
                    target.android('layout_height', '0px');
                    target.android('layout_rowWeight', '1');
                }
                target.mergeGravity('layout_gravity', 'fill_vertical');
            }
            if (!target.has('width')) {
                target.mergeGravity('layout_gravity', 'fill_horizontal');
            }
        }
        return { output, parent: container, complete: output !== '' };
    }

    public postBaseLayout(node: T) {
        const mainData: CssGridData<T> = node.data($const.EXT_NAME.CSS_GRID, 'mainData');
        if (mainData) {
            function setContentSpacing(alignment: string, direction: string) {
                const MARGIN_START = direction === 'column' ? $enum.BOX_STANDARD.MARGIN_LEFT : $enum.BOX_STANDARD.MARGIN_TOP;
                const MARGIN_END = direction === 'column' ? $enum.BOX_STANDARD.MARGIN_RIGHT : $enum.BOX_STANDARD.MARGIN_BOTTOM;
                const PADDING_START = direction === 'column' ? $enum.BOX_STANDARD.PADDING_LEFT : $enum.BOX_STANDARD.PADDING_TOP;
                const data = <CssGridDirectionData> mainData[direction];
                const rowData = alignment.startsWith('space') ? getRowData(mainData, direction) : [];
                const sizeTotal = getGridSize(mainData, direction, node);
                if (sizeTotal > 0) {
                    const dimension = direction === 'column' ? 'width' : 'height';
                    const itemCount = mainData[direction].count;
                    const adjusted = new Set<T>();
                    switch (alignment) {
                        case 'center':
                            node.modifyBox(PADDING_START, Math.floor(sizeTotal / 2));
                            data.normal = false;
                            break;
                        case 'right':
                            if (direction === 'row') {
                                break;
                            }
                        case 'end':
                        case 'flex-end':
                            node.modifyBox(PADDING_START, sizeTotal);
                            data.normal = false;
                            break;
                        case 'space-around': {
                            const marginSize = Math.floor(sizeTotal / (itemCount * 2));
                            for (let i = 0; i < itemCount; i++) {
                                new Set<T>($util.flatArray(rowData[i])).forEach(item => {
                                    if (!adjusted.has(item)) {
                                        item.modifyBox(MARGIN_START, marginSize);
                                        if (i < itemCount - 1) {
                                            item.modifyBox(MARGIN_END, marginSize);
                                        }
                                        adjusted.add(item);
                                    }
                                    else {
                                        item.cssPX(dimension, marginSize * 2);
                                    }
                                });
                            }
                            data.normal = false;
                            break;
                        }
                        case 'space-between': {
                            const marginSize = Math.floor(sizeTotal / ((itemCount - 1) * 2));
                            const rowLast = $util.flatArray(rowData[itemCount - 1]);
                            for (let i = 0; i < itemCount; i++) {
                                new Set<T>($util.flatArray(rowData[i])).forEach(item => {
                                    if (!adjusted.has(item)) {
                                        if (i > 0) {
                                            item.modifyBox(MARGIN_START, marginSize);
                                        }
                                        if (i < itemCount - 1 && !rowLast.some(cell => cell === item)) {
                                            item.modifyBox(MARGIN_END, marginSize);
                                        }
                                        adjusted.add(item);
                                    }
                                    else {
                                        item.cssPX(dimension, marginSize * 2);
                                    }
                                });
                            }
                            data.normal = false;
                            break;
                        }
                        case 'space-evenly': {
                            const marginSize = Math.floor(sizeTotal / (itemCount + 1));
                            const rowLast = $util.flatArray(rowData[itemCount - 1]);
                            for (let i = 0; i < itemCount; i++) {
                                const marginMiddle = Math.floor(marginSize / 2);
                                new Set<T>($util.flatArray(rowData[i])).forEach(item => {
                                    if (!adjusted.has(item)) {
                                        item.modifyBox(MARGIN_START, i === 0 ? marginSize : marginMiddle);
                                        if (i < itemCount - 1 && !rowLast.some(cell => cell === item)) {
                                            item.modifyBox(MARGIN_END, marginMiddle);
                                        }
                                        adjusted.add(item);
                                    }
                                    else {
                                        item.cssPX(dimension, marginSize);
                                    }
                                });
                            }
                            data.normal = false;
                            break;
                        }
                    }
                }
            }
            if (node.hasWidth && mainData.justifyContent !== 'normal') {
                setContentSpacing(mainData.justifyContent, 'column');
            }
            if (node.hasHeight && mainData.alignContent !== 'normal') {
                setContentSpacing(mainData.alignContent, 'row');
            }
            if (mainData.column.normal && !mainData.column.unit.includes('auto')) {
                const columnGap =  mainData.column.gap * (mainData.column.count - 1);
                if (columnGap > 0) {
                    if (node.renderParent && !node.renderParent.hasAlign($enum.NODE_ALIGNMENT.AUTO_LAYOUT)) {
                        node.cssPX('minWidth', columnGap);
                        node.cssPX('width', columnGap, false, true);
                    }
                    if (!node.has('width') && node.has('maxWidth')) {
                        node.css('width', $util.formatPX(node.bounds.width + columnGap), true);
                    }
                }
            }
        }
    }

    public postProcedure(node: T) {
        const mainData: CssGridData<T> = node.data($const.EXT_NAME.CSS_GRID, 'mainData');
        if (mainData) {
            const controller = <android.lib.base.Controller<T>> this.application.controllerHandler;
            const lastChild = Array.from(mainData.children)[mainData.children.size - 1];
            if (mainData.column.unit.every(value => $util.isPercent(value))) {
                const percentTotal = mainData.column.unit.reduce((a, b) => a + parseInt(b), 0);
                if (percentTotal < 100) {
                    node.android('columnCount', (mainData.column.count + 1).toString());
                    for (let i = 0; i < mainData.row.count; i++) {
                        controller.appendAfter(
                            lastChild.id,
                            controller.renderSpace(
                                node.renderDepth + 1,
                                $util.formatPercent(100 - percentTotal),
                                'wrap_content',
                                0,
                                0,
                                createAttribute({
                                    android: {
                                        [node.localizeString(BOX_ANDROID.MARGIN_LEFT)]: $util.formatPX(mainData.column.gap),
                                        layout_row: i.toString(),
                                        layout_column: mainData.column.count.toString()
                                    }
                                })
                            )
                        );
                    }
                }
            }
            for (let i = 0; i < mainData.emptyRows.length; i++) {
                const item = mainData.emptyRows[i];
                if (item) {
                    for (let j = 0; j < item.length; j++) {
                        if (item[j] === 1) {
                            controller.appendAfter(
                                lastChild.id,
                                controller.renderSpace(
                                    node.renderDepth + 1,
                                    'wrap_content',
                                    $util.formatPX(mainData.row.gap),
                                    0,
                                    0,
                                    createAttribute({
                                        android: {
                                            layout_row: i.toString(),
                                            layout_column: j.toString()
                                        }
                                    })
                                )
                            );
                            break;
                        }
                    }
                }
            }
        }
    }
}