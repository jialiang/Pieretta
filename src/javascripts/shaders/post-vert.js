const postVert = `

precision mediump float;

attribute vec3 vert_pos;
attribute vec2 vert_uv;

varying vec2 frag_uv;

void main(){
    frag_uv = vert_uv;
    gl_Position = vec4(vert_pos, 1.0);
}

`;
