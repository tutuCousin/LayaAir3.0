import { WebGLExtension } from "./GLEnum/WebGLExtension";
import { RenderCapable } from "./RenderEnum/RenderCapable";
import { RenderParams } from "./RenderEnum/RenderParams";
import { WebGLEngine } from "./WebGLEngine";

/**
 * 
 */
export class GLParams{
    _engine: WebGLEngine;
    _gl: WebGLRenderingContext | WebGL2RenderingContext;
    _glParamsData:Map<RenderParams,number>;
    constructor(engine: WebGLEngine){
        this._engine = engine;
        this._gl = this._engine.gl;
        this._initParams();
    }

    private _initParams(){
        const gl = this._gl;
        this._glParamsData = new Map();
        this._glParamsData.set(RenderParams.Max_Active_Texture_Count,gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS));
        const maxVertexUniform:number = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
        const maxFragUniform:number = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
        this._glParamsData.set(RenderParams.Max_Uniform_Count,Math.min(maxVertexUniform,maxFragUniform));
        this._glParamsData.set(RenderParams.MAX_Texture_Size,gl.getParameter(gl.MAX_TEXTURE_SIZE));
        this._glParamsData.set(RenderParams.MAX_Texture_Image_Uint,gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS));
        if(this._engine.getCapable(RenderCapable.Texture_anisotropic)){
            const anisoExt = this._engine._supportCapatable.getExtension(WebGLExtension.EXT_texture_filter_anisotropic);
            this._glParamsData.set(RenderParams.Max_AnisoLevel_Count,gl.getParameter(anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT));
        }
        if(this._engine.isWebGL2)
            this._glParamsData.set(RenderParams.SHADER_CAPAILITY_LEVEL,35);
        else
            this._glParamsData.set(RenderParams.SHADER_CAPAILITY_LEVEL,30);
    }

    getParams(params:RenderParams):number{
        return this._glParamsData.get(params);
    }
}