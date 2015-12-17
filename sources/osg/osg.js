<<<<<<< HEAD
'use strict';
var AutoTransform = require( 'osg/AutoTransform' );
var BillboardAttribute = require( 'osg/BillboardAttribute' );
var BlendColor = require( 'osg/BlendColor' );
var BlendFunc = require( 'osg/BlendFunc' );
var BoundingBox = require( 'osg/BoundingBox' );
var BoundingSphere = require( 'osg/BoundingSphere' );
var BufferArray = require( 'osg/BufferArray' );
var Camera = require( 'osg/Camera' );
var ColorMask = require( 'osg/ColorMask' );
var ComputeBoundsVisitor = require( 'osg/ComputeBoundsVisitor' );
var ComputeMatrixFromNodePath = require( 'osg/ComputeMatrixFromNodePath' );
var CullFace = require( 'osg/CullFace' );
var CullingSet = require( 'osg/CullingSet' );
var CullSettings = require( 'osg/CullSettings' );
var CullStack = require( 'osg/CullStack' );
var CullVisitor = require( 'osg/CullVisitor' );
var Depth = require( 'osg/Depth' );
var DrawArrayLengths = require( 'osg/DrawArrayLengths' );
var DrawArrays = require( 'osg/DrawArrays' );
var DrawElements = require( 'osg/DrawElements' );
var EllipsoidModel = require( 'osg/EllipsoidModel' );
var FrameBufferObject = require( 'osg/FrameBufferObject' );
var FrameStamp = require( 'osg/FrameStamp' );
var Geometry = require( 'osg/Geometry' );
var GLObject = require( 'osg/GLObject' );
var Image = require( 'osg/Image' );
var ImageStream = require( 'osg/ImageStream' );
var KdTree = require( 'osg/KdTree' );
var KdTreeBuilder = require( 'osg/KdTreeBuilder' );
var Light = require( 'osg/Light' );
var LightSource = require( 'osg/LightSource' );
var LineWidth = require( 'osg/LineWidth' );
var Lod = require( 'osg/Lod' );
var Map = require( 'osg/Map' );
var Material = require( 'osg/Material' );
var osgjsMath = require( 'osg/Math' );
var Matrix = require( 'osg/Matrix' );
var MatrixMemoryPool = require( 'osg/MatrixMemoryPool' );
var MatrixTransform = require( 'osg/MatrixTransform' );
var Node = require( 'osg/Node' );
var NodeVisitor = require( 'osg/NodeVisitor' );
var Notify = require( 'osg/Notify' );
var Object = require( 'osg/Object' );
var PagedLOD = require( 'osg/PagedLOD' );
var Polytope = require( 'osg/Polytope' );
var Plane = require( 'osg/Plane' );
var PrimitiveFunctor = require( 'osg/PrimitiveFunctor' );
var PrimitiveSet = require( 'osg/PrimitiveSet' );
var Program = require( 'osg/Program' );
var Projection = require( 'osg/Projection' );
var Quat = require( 'osg/Quat' );
var RenderBin = require( 'osg/RenderBin' );
var RenderLeaf = require( 'osg/RenderLeaf' );
var RenderStage = require( 'osg/RenderStage' );
var Shader = require( 'osg/Shader' );
var Shape = require( 'osg/Shape' );
var Stack = require( 'osg/Stack' );
var State = require( 'osg/State' );
var StateAttribute = require( 'osg/StateAttribute' );
var StateGraph = require( 'osg/StateGraph' );
var StateSet = require( 'osg/StateSet' );
var Texture = require( 'osg/Texture' );
var TextureCubeMap = require( 'osg/TextureCubeMap' );
var Transform = require( 'osg/Transform' );
var TriangleIndexFunctor = require( 'osg/TriangleIndexFunctor' );
var Uniform = require( 'osg/Uniform' );
var UpdateVisitor = require( 'osg/UpdateVisitor' );
var MACROUTILS = require( 'osg/Utils' );
var Vec2 = require( 'osg/Vec2' );
var Vec3 = require( 'osg/Vec3' );
var Vec4 = require( 'osg/Vec4' );
var Viewport = require( 'osg/Viewport' );
var osgPool = require( 'osgUtil/osgPool' );
var TransformEnums = require( 'osg/TransformEnums' );
var Timer = require( 'osg/Timer' );
var TimerGPU = require( 'osg/TimerGPU' );
var WebGLCaps = require( 'osg/WebGLCaps' );

=======
define( [
    'osg/AutoScaleAttribute',
    'osg/BillboardAttribute',
    'osg/BlendColor',
    'osg/BlendFunc',
    'osg/BoundingBox',
    'osg/BoundingSphere',
    'osg/BufferArray',
    'osg/Camera',
    'osg/ColorMask',
    'osg/ComputeBoundsVisitor',
    'osg/ComputeMatrixFromNodePath',
    'osg/CullFace',
    'osg/CullingSet',
    'osg/CullSettings',
    'osg/CullStack',
    'osg/CullVisitor',
    'osg/Depth',
    'osg/DrawArrayLengths',
    'osg/DrawArrays',
    'osg/DrawElements',
    'osg/EllipsoidModel',
    'osg/FrameBufferObject',
    'osg/FrameStamp',
    'osg/Geometry',
    'osg/GLObject',
    'osg/Image',
    'osg/ImageStream',
    'osg/KdTree',
    'osg/KdTreeBuilder',
    'osg/Light',
    'osg/LightSource',
    'osg/LineWidth',
    'osg/Lod',
    'osg/Map',
    'osg/Material',
    'osg/Math',
    'osg/Matrix',
    'osg/MatrixTransform',
    'osg/Node',
    'osg/NodeVisitor',
    'osg/Notify',
    'osg/Object',
    'osg/PagedLOD',
    'osg/Polytope',
    'osg/Plane',
    'osg/PrimitiveFunctor',
    'osg/PrimitiveSet',
    'osg/Program',
    'osg/Projection',
    'osg/Quat',
    'osg/RenderBin',
    'osg/RenderLeaf',
    'osg/RenderStage',
    'osg/Shader',
    'osg/Shape',
    'osg/Stack',
    'osg/State',
    'osg/StateAttribute',
    'osg/StateGraph',
    'osg/StateSet',
    'osg/Texture',
    'osg/TextureCubeMap',
    'osg/Transform',
    'osg/TriangleIndexFunctor',
    'osg/Uniform',
    'osg/UpdateVisitor',
    'osg/Utils',
    'osg/Vec2',
    'osg/Vec3',
    'osg/Vec4',
    'osg/Viewport',
    'osgUtil/osgPool',
    'osg/TransformEnums',
    'osg/Timer',
    'osg/WebGLCaps'

], function (
    AutoScaleAttribute,
    BillboardAttribute,
    BlendColor,
    BlendFunc,
    BoundingBox,
    BoundingSphere,
    BufferArray,
    Camera,
    ColorMask,
    ComputeBoundsVisitor,
    ComputeMatrixFromNodePath,
    CullFace,
    CullingSet,
    CullSettings,
    CullStack,
    CullVisitor,
    Depth,
    DrawArrayLengths,
    DrawArrays,
    DrawElements,
    EllipsoidModel,
    FrameBufferObject,
    FrameStamp,
    Geometry,
    GLObject,
    Image,
    ImageStream,
    KdTree,
    KdTreeBuilder,
    Light,
    LightSource,
    LineWidth,
    Lod,
    Map,
    Material,
    Math,
    Matrix,
    MatrixTransform,
    Node,
    NodeVisitor,
    Notify,
    Object,
    PagedLOD,
    Polytope,
    Plane,
    PrimitiveFunctor,
    PrimitiveSet,
    Program,
    Projection,
    Quat,
    RenderBin,
    RenderLeaf,
    RenderStage,
    Shader,
    Shape,
    Stack,
    State,
    StateAttribute,
    StateGraph,
    StateSet,
    Texture,
    TextureCubeMap,
    Transform,
    TriangleIndexFunctor,
    Uniform,
    UpdateVisitor,
    MACROUTILS,
    Vec2,
    Vec3,
    Vec4,
    Viewport,
    osgPool,
    TransformEnums,
    Timer,
    WebGLCaps ) {
>>>>>>> Change Lighting to have two default lights. Sky and Head

var osg = {};
osg.AutoTransform = AutoTransform;
osg.BillboardAttribute = BillboardAttribute;
osg.BlendColor = BlendColor;
osg.BlendFunc = BlendFunc;
osg.BoundingBox = BoundingBox;
osg.BoundingSphere = BoundingSphere;
osg.BufferArray = BufferArray;
osg.ColorMask = ColorMask;
osg.Camera = Camera;
osg.ColorMask = ColorMask;
osg.ComputeBoundsVisitor = ComputeBoundsVisitor;
MACROUTILS.objectMix( osg, ComputeMatrixFromNodePath );
osg.CullFace = CullFace;
osg.CullingSet = CullingSet;
osg.CullSettings = CullSettings;
osg.CullStack = CullStack;
osg.CullVisitor = CullVisitor;
osg.Depth = Depth;
osg.DrawArrayLengths = DrawArrayLengths;
osg.DrawArrays = DrawArrays;
osg.DrawElements = DrawElements;
osg.EllipsoidModel = EllipsoidModel;
osg.WGS_84_RADIUS_EQUATOR = EllipsoidModel.WGS_84_RADIUS_EQUATOR;
osg.WGS_84_RADIUS_POLAR = EllipsoidModel.WGS_84_RADIUS_POLAR;
osg.FrameBufferObject = FrameBufferObject;
osg.FrameStamp = FrameStamp;
osg.Geometry = Geometry;
osg.GLObject = GLObject;
osg.Image = Image;
osg.ImageStream = ImageStream;
osg.KdTree = KdTree;
osg.KdTreeBuilder = KdTreeBuilder;
osg.Light = Light;
osg.LightSource = LightSource;
osg.LineWidth = LineWidth;
osg.Lod = Lod;
osg.Map = Map;
osg.Material = Material;
MACROUTILS.objectMix( osg, osgjsMath );
osg.Matrix = Matrix;
osg.MatrixTransform = MatrixTransform;
osg.MatrixMemoryPool = MatrixMemoryPool;
osg.Node = Node;
osg.NodeVisitor = NodeVisitor;
MACROUTILS.objectMix( osg, Notify );
osg.Object = Object;
osg.PagedLOD = PagedLOD;
osg.Plane = Plane;
osg.Polytope = Polytope;
osg.PrimitiveSet = PrimitiveSet;
osg.PrimitiveFunctor = PrimitiveFunctor;
osg.Program = Program;
osg.Projection = Projection;
osg.Quat = Quat;
osg.RenderBin = RenderBin;
osg.RenderLeaf = RenderLeaf;
osg.RenderStage = RenderStage;
osg.Shader = Shader;
MACROUTILS.objectMix( osg, Shape );
osg.Stack = Stack;
osg.State = State;
osg.StateAttribute = StateAttribute;
osg.StateGraph = StateGraph;
osg.StateSet = StateSet;
osg.Texture = Texture;
osg.TextureCubeMap = TextureCubeMap;
osg.Transform = Transform;
osg.TriangleIndexFunctor = TriangleIndexFunctor;
osg.Uniform = Uniform;
osg.UpdateVisitor = UpdateVisitor;
MACROUTILS.objectMix( osg, MACROUTILS );
osg.Vec2 = Vec2;
osg.Vec3 = Vec3;
osg.Vec4 = Vec4;
osg.Viewport = Viewport;

<<<<<<< HEAD
osg.memoryPools = osgPool.memoryPools;
=======
    var osg = {};
    osg.AutoScaleAttribute = AutoScaleAttribute;
    osg.BillboardAttribute = BillboardAttribute;
    osg.BlendColor = BlendColor;
    osg.BlendFunc = BlendFunc;
    osg.BoundingBox = BoundingBox;
    osg.BoundingSphere = BoundingSphere;
    osg.BufferArray = BufferArray;
    osg.ColorMask = ColorMask;
    osg.Camera = Camera;
    osg.ColorMask = ColorMask;
    osg.ComputeBoundsVisitor = ComputeBoundsVisitor;
    MACROUTILS.objectMix( osg, ComputeMatrixFromNodePath );
    osg.CullFace = CullFace;
    osg.CullingSet = CullingSet;
    osg.CullSettings = CullSettings;
    osg.CullStack = CullStack;
    osg.CullVisitor = CullVisitor;
    osg.Depth = Depth;
    osg.DrawArrayLengths = DrawArrayLengths;
    osg.DrawArrays = DrawArrays;
    osg.DrawElements = DrawElements;
    osg.EllipsoidModel = EllipsoidModel;
    osg.WGS_84_RADIUS_EQUATOR = EllipsoidModel.WGS_84_RADIUS_EQUATOR;
    osg.WGS_84_RADIUS_POLAR = EllipsoidModel.WGS_84_RADIUS_POLAR;
    osg.FrameBufferObject = FrameBufferObject;
    osg.FrameStamp = FrameStamp;
    osg.Geometry = Geometry;
    osg.GLObject = GLObject;
    osg.Image = Image;
    osg.ImageStream = ImageStream;
    osg.KdTree = KdTree;
    osg.KdTreeBuilder = KdTreeBuilder;
    osg.Light = Light;
    osg.LightSource = LightSource;
    osg.LineWidth = LineWidth;
    osg.Lod = Lod;
    osg.Map = Map;
    osg.Material = Material;
    MACROUTILS.objectMix( osg, Math );
    osg.Matrix = Matrix;
    osg.MatrixTransform = MatrixTransform;
    osg.Node = Node;
    osg.NodeVisitor = NodeVisitor;
    MACROUTILS.objectMix( osg, Notify );
    osg.Object = Object;
    osg.PagedLOD = PagedLOD;
    osg.Plane = Plane;
    osg.Polytope = Polytope;
    osg.PrimitiveSet = PrimitiveSet;
    osg.PrimitiveFunctor = PrimitiveFunctor;
    osg.Program = Program;
    osg.Projection = Projection;
    osg.Quat = Quat;
    osg.RenderBin = RenderBin;
    osg.RenderLeaf = RenderLeaf;
    osg.RenderStage = RenderStage;
    osg.Shader = Shader;
    MACROUTILS.objectMix( osg, Shape );
    osg.Stack = Stack;
    osg.State = State;
    osg.StateAttribute = StateAttribute;
    osg.StateGraph = StateGraph;
    osg.StateSet = StateSet;
    osg.Texture = Texture;
    osg.TextureCubeMap = TextureCubeMap;
    osg.Transform = Transform;
    osg.TriangleIndexFunctor = TriangleIndexFunctor;
    osg.Uniform = Uniform;
    osg.UpdateVisitor = UpdateVisitor;
    MACROUTILS.objectMix( osg, MACROUTILS );
    osg.Vec2 = Vec2;
    osg.Vec3 = Vec3;
    osg.Vec4 = Vec4;
    osg.Viewport = Viewport;
>>>>>>> Change Lighting to have two default lights. Sky and Head

osg.Transform.RELATIVE_RF = TransformEnums.RELATIVE_RF;
osg.Transform.ABSOLUTE_RF = TransformEnums.ABSOLUTE_RF;
osg.Timer = Timer;
osg.TimerGPU = TimerGPU;
osg.WebGLCaps = WebGLCaps;


module.exports = osg;
