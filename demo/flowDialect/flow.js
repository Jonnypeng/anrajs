/**
 * Created with JetBrains WebStorm.
 * User: Hasee
 * Date: 16-11-7
 * Time: 下午4:14
 * To change this template use File | Settings | File Templates.
 */
/**/
SYSTEM = 0;
SEGMENT = 1;
BALANCE = 2;


FlowEditor = anra.gef.Editor.extend({
    editParts:null,
    background:'#FFFFFF',

    registActions:function () {
        var editor = this;
        this.actionRegistry.regist({
            id:1,
            type:ACTION_SELECTION,
            key:'ctrl+z',
            run:function () {
                editor.cmdStack.undo();
            }
        }).regist({
                id:2,
                type:ACTION_SELECTION,
                key:'delete',
                run:function () {
                    var selection = editor.rootEditPart.selection;
                    var cmd = this.createDeleteCommand(selection);
                    if (cmd != null)
                        editor.execute(cmd);
                    editor.rootEditPart.setSelection(null);
                },
                createDeleteCommand:function (node) {
                    if (node instanceof anra.gef.NodeEditPart)
                        return new anra.gef.DeleteNodeAndLineCommand(editor.rootEditPart, node);
                    else if (node instanceof anra.gef.LineEditPart)
                        return new anra.gef.DeleteLineCommand(editor.rootEditPart, node);
                    else if (node instanceof Array)
                        return new anra.gef.DeleteNodeAndLineCommand(editor.rootEditPart, node);
                }
            }).regist({
                id:3,
                type:ACTION_SELECTION,
                key:'ctrl+y',
                run:function () {
                    editor.cmdStack.redo();
                }
            }).regist({
                id:4,
                type:ACTION_SELECTION,
                key:'escape',
                run:function () {
                    editor.setActiveTool(editor.getDefaultTool());
//                    editor.cmdStack.redo();
                }
            });
    },
    /**
     *第一步，把json输入解析为model
     *
     * @param input
     * @return {*}
     */
    input2model:function (input, rootModel) {
        var nodes = input['nodes'];
        var lines, nm, list, line, target;
        var targetCache = new Map();
        //遍历nodes，每个node生成一个节点模型（NodeModel）
        for (var i = 0; i < nodes.length; i++) {
            nm = new anra.gef.NodeModel();
            nm.id = nodes[i].id;
            //定义EditPart
            nm.editPartClass = EditPartRegistry[nodes[i].type];
            //设置属性
            nm.setProperties(nodes[i]);
            lines = nodes[i]['lines'];

            /*--------开始添加连线---------*/
            //添加连线，根据连线定义来确定连线的source和target
            if (lines != null)
                for (var inx = 0; inx < lines.length; inx++) {
                    line = this.createLine(lines[inx]);
                    nm.addSourceLine(line);
                    //记录连线目标节点的id
                    list = targetCache.get(line.getValue('target'));
                    if (list == null) {
                        list = [];
                        targetCache.set(line.getValue('target'), list);
                    }
                    list.push(line);

                    target = rootModel.getChild(line.getValue('target'));
                    if (target != null)
                        target.addTargetLine(line);
                }
            list = targetCache.get(nodes[i].id);
            if (list != null) {
                for (inx = 0; inx < list.length; inx++) {
                    nm.addTargetLine(list[inx]);
                }
                targetCache.remove(nodes[i].id);
            }
            /*----------连线添加完毕-----------*/
            rootModel.addChild(nm);
        }
        //释放缓存
        targetCache = null;
    },
    addNode:function (json) {
        var node = new anra.gef.NodeModel();
        node.setProperties(json);
        node.id = json.id;

        node.editPartClass = EditPartRegistry[json.type];

        var cmd = new anra.gef.CreateNodeCommand(this.rootEditPart, node);
        var lines = json['lines'];
        /*--------开始添加连线---------*/
        //添加连线，根据连线定义来确定连线的source和target
        if (lines != null)
            for (var inx = 0; inx < lines.length; inx++) {
                var line = this.createLine(lines[inx]);
                cmd = cmd.chain(new anra.gef.CreateLineCommand(this.rootEditPart, line, json.id, line.getValue('target')));
            }

        this.cmdStack.execute(cmd);
    },
    initRootEditPart:function (editPart) {
    },
    createLine:function (json) {
        var lineModel = new anra.gef.LineModel();
        lineModel.setProperties(json);
        lineModel.id = json.id;
        lineModel.sourceTerminal = json.sTML;
        lineModel.targetTerminal = json.tTML;
        return lineModel;
    },
    getCustomPolicies:function () {
        this.put(anra.gef.LAYOUT_POLICY, new FlowLayoutPolicy());
        this.put(anra.gef.CONNECTION_POLICY, new anra.gef.LinkModPolicy());
    }
})
;


FlowLayoutPolicy = anra.gef.LayoutPolicy.extend({

    createChildEditPolicy:function (child) {
//        return new ChildPolicy();
    }
});

ChildPolicy = anra.gef.AbstractEditPolicy.extend({
    class:'ShadowPolicy',
    showTargetFeedback:function (request) {
    },
    eraseTargetFeedback:function (request) {
    },
    getCommand:function (request) {
        return new c();
    },
    getLayoutEditParts:function (request) {
        return null;
    }
});
var c = anra.Command.extend({
    execute:function () {
        alert('不能移动到此处');
    }
});
/**
 * 节点EditPart父类，Editpart决定节点的图形、连线的控制器等
 * @type {*}
 */
var CommonNodeEditPart = anra.gef.NodeEditPart.extend({
    /**
     * 用于同步model和figure。
     */
    refreshVisual:function () {
        if (this.model != null && this.figure != null) {
            var b = this.model.getValue('bounds');
            this.figure.setBounds({x:b[0], y:b[1], width:b[2], height:b[3] });
        }
        this.figure.paint();
    },
    createLineEditPart:function () {
        return new CommonLineEditPart();
    },
    createDragTracker:function (request) {
        return new anra.gef.DragTracker();
    },
    createFigure:function () {
        var f = new CommonFigure();
        f.setUrl(this.getImage());
        return f;
    }
});

/*--------详细节点控制器定义--------*/
var SystemEditPart = CommonNodeEditPart.extend({
    getImage:function () {
        return "system.png";
    },
    createEditPolicies:function () {
        this.installEditPolicy('text', new TextInfoPolicy());
        this.installEditPolicy(anra.gef.CONNECTION_POLICY, new anra.gef.ConnectionPolicy());
        this.installEditPolicy("selection", new anra.gef.ResizableEditPolicy());
    }
});
var SegmentEditPart = CommonNodeEditPart.extend({
    getImage:function () {
        return "segment.png";
    },
    createEditPolicies:function () {
        this.installEditPolicy('text', new TextInfoPolicy());
        this.installEditPolicy(anra.gef.CONNECTION_POLICY, new anra.gef.ConnectionPolicy());
        this.installEditPolicy("selection", new anra.gef.ResizableEditPolicy());
    }
});
var BalanceEditPart = CommonNodeEditPart.extend({
    getImage:function () {
        return "balance.png";
    },
    createEditPolicies:function () {
        this.installEditPolicy("selection", new anra.gef.ResizableEditPolicy());
    }
});


EditPartRegistry = {
    0:SystemEditPart,
    1:SegmentEditPart,
    2:BalanceEditPart
};

/*-------详细节点控制器定义结束-------*/
/*-------策略------*/
TextInfoPolicy = anra.gef.AbstractEditPolicy.extend({
    handle:null,
    class:'TextInfoPolicy',
    activate:function () {
        this.handle = new TextHandle(this.getHost());
        this.handle.setText(this.getHost().model.getValue('name'));
        this.getHandleLayer().addChild(this.handle);
    },
    deactivate:function () {
        this.getHandleLayer().removeChild(this.handle);
    }
});

TextHandle = anra.Handle.extend(anra.svg.Text).extend({
    refreshLocation:function (figure) {
        if (this.owner == null || figure == null)
            return;
        this.owner.setAttribute('x', figure.fattr('x'));
        this.owner.setAttribute('y', figure.fattr('y') + figure.fattr('height') + 10);
    }

});


/**
 * 通用图形
 *
 * @type {*}
 */
CommonFigure = anra.gef.Figure.extend(anra.svg.Image).extend({
    init:function () {
        var off = 8;
        //注册anchor布局策略
        this.registAnchors([
            {id:0, dir:anra.EAST, offset:-off},
            {id:1, dir:anra.EAST, offset:off},
            {id:2, dir:anra.WEST, offset:-off},
            {id:3, dir:anra.WEST, offset:off},
            {id:4, dir:anra.NORTH, offset:-off},
            {id:5, dir:anra.NORTH, offset:off},
            {id:6, dir:anra.SOUTH, offset:-off},
            {id:7, dir:anra.SOUTH, offset:off}
        ]);

//        this.registAnchor({id:0, dir:anra.EAST, offset:-off});
//        this.registAnchor({id:1, dir:anra.EAST, offset:off});
//
//        this.registAnchor({id:2, dir:anra.WEST, offset:-off});
//        this.registAnchor({id:3, dir:anra.WEST, offset:off});
//
//        this.registAnchor({id:4, dir:anra.NORTH, offset:-off});
//        this.registAnchor({id:5, dir:anra.NORTH, offset:off});
//
//        this.registAnchor({id:6, dir:anra.SOUTH, offset:-off});
//        this.registAnchor({id:7, dir:anra.SOUTH, offset:off});
    }
})
;


/*-------连线定义------*/

CommonLineEditPart = anra.gef.LineEditPart.extend({
    refreshVisual:function () {

        var color = this.model.getValue('color') == null ? 'green' : this.model.getValue('color');
        this.figure.setAttribute('stroke', color);
        this.figure.paint();
    },
    createFigure:function (model) {
        var f = new Line(this.model);
        var e = this;
        f.addListener(anra.EVENT.MouseIn, function () {
            f.model.setValue('color', 'red');
            e.refresh();
        });
        f.addListener(anra.EVENT.MouseOut, function () {
            f.model.setValue('color', 'green');
            e.refresh();
        });
        return f;
    },
    createEditPolicies:function () {
        this.installEditPolicy("selection", new anra.gef.LineSelectionPolicy());
    }
});


Line = anra.gef.Line.extend({
        router:function (line) {
            if (line.points == null || line.points.length < 2)
                return null;

            var sp = line.getStartPoint(), ep = line.getEndPoint();


            var mid = (sp.x + ep.x) / 2;
            var p1 = {
                x:mid,
                y:sp.y
            };

            var p2 = {
                x:mid,
                y:ep.y
            };
//            var mid = (sp.y + ep.y) / 2;
//            var p1 = {
//                y:mid,
//                x:sp.x
//            };
//
//            var p2 = {
//                y:mid,
//                x:ep.x
//            };
            return  [sp, p1, p2, ep];
        },
        init:function (model) {
            anra.gef.Line.prototype.init.call(this, model);
        },
        createContent:function () {
            var marker = new anra.svg.TriangleMarker();
//            marker.setId(this.model.hashCode());
            marker.propKey = 'color';
            marker.setFigureAttribute({
                    fill:'white',
                    stroke:'black'}
            );
            this.setEndMarker(marker);

        },
        mouseIn:function () {
        },
        mouseOut:function () {
        },
        initProp:function () {
            this.setAttribute({
                stroke:'rgb(30,146,94)',
                fill:'none',
                'stroke-width':'2'
            });
        }
    }
);

