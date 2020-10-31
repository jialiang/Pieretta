const vert = `

precision mediump float;

attribute vec3 vert_pos;
attribute vec3 vert_norm;
attribute vec3 vert_tang;
attribute vec3 vert_bitang;
attribute vec2 vert_uv;

uniform mat4 model_mtx;
uniform mat4 norm_mtx;
uniform mat4 proj_mtx;
uniform float hasNormalAndDisplacement;

varying vec2 frag_uv;
varying vec3 frag_norm;
varying vec3 frag_light_pos;

varying vec3 ts_light_pos;
varying vec3 ts_view_pos;
varying vec3 ts_frag_pos;

mat3 transpose(in mat3 inMatrix) {
    vec3 i0 = inMatrix[0];
    vec3 i1 = inMatrix[1];
    vec3 i2 = inMatrix[2];

    mat3 outMatrix = mat3(
        vec3(i0.x, i1.x, i2.x),
        vec3(i0.y, i1.y, i2.y),
        vec3(i0.z, i1.z, i2.z)
    );

    return outMatrix;
}

void main(void) {
    gl_Position = proj_mtx * vec4(vert_pos, 1.0);

    vec3 light_pos = vec3(0.0, 10.5, 28.0);

    if (hasNormalAndDisplacement == 1.0) {
        ts_frag_pos = vec3(model_mtx * vec4(vert_pos, 1.0));

        vec3 t = normalize(mat3(norm_mtx) * vert_tang);
        vec3 b = normalize(mat3(norm_mtx) * vert_bitang);
        vec3 n = normalize(mat3(norm_mtx) * vert_norm);
        mat3 tbn = transpose(mat3(t, b, n));

        ts_light_pos = tbn * light_pos;
        ts_view_pos = tbn * vec3(0, 0, 0);
        ts_frag_pos = tbn * ts_frag_pos;
    } else {
        frag_norm = (model_mtx * vec4(vert_norm, 0.0)).xyz;
        frag_light_pos = light_pos;
    }

    frag_uv = vert_uv;
}

`;
