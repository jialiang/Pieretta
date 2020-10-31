const postFrag = `

precision mediump float;

uniform sampler2D tex_diffuse;
uniform vec2 resolution;

varying vec2 frag_uv;

vec4 textureBicubic(sampler2D sampler, vec2 texCoords, vec2 resolution){
    vec2 texSize = resolution;
    vec2 invTexSize = 1.0 / texSize;

    texCoords *= texSize;

    vec2 texCenter = floor(texCoords - 0.5) + 0.5;

    vec2 f = texCoords - texCenter;
    vec2 f2 = f * f;
    vec2 f3 = f2 * f;

    vec2 w0 = f2 - 0.5 * (f3 + f);
    vec2 w1 = 1.5 * f3 - 2.5 * f2 + 1.0;
    vec2 w3 = 0.5 * (f3 - f2);
    vec2 w2 = 1.0 - w0 - w1 - w3;

    vec2 s0 = w0 + w1;
    vec2 s1 = w2 + w3;

    vec2 f0 = w1 / s0;
    vec2 f1 = w3 / s1;
 
    vec2 t0 = (texCenter - 1.0 + f0) / texSize;
    vec2 t1 = (texCenter + 1.0 + f1) / texSize;

    vec4 sample1 = texture2D(sampler, vec2(t0.x, t0.y)) * s0.x * s0.y;
    vec4 sample2 = texture2D(sampler, vec2(t1.x, t0.y)) * s1.x * s0.y; 
    vec4 sample3 = texture2D(sampler, vec2(t0.x, t1.y)) * s0.x * s1.y;
    vec4 sample4 = texture2D(sampler, vec2(t1.x, t1.y)) * s1.x * s1.y;

    return sample1 + sample2 + sample3 + sample4;
}

void main(){
    gl_FragColor = textureBicubic(tex_diffuse, frag_uv, resolution);
}

`;
