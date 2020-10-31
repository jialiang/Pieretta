const frag = `

precision mediump float;

uniform sampler2D tex_norm;
uniform sampler2D tex_diffuse;
uniform sampler2D tex_depth;
uniform float hasNormalAndDisplacement;

float depth_scale = 0.025;
float num_layers = 8.0;

varying vec2 frag_uv;
varying vec3 frag_norm;
varying vec3 frag_light_pos;

varying vec3 ts_light_pos;
varying vec3 ts_view_pos;
varying vec3 ts_frag_pos;

vec2 parallax_uv(vec2 uv, vec3 view_dir) {
    float layer_depth = 1.0 / num_layers;
    float cur_layer_depth = 0.0;
    vec2 delta_uv = view_dir.xy * depth_scale / (view_dir.z * num_layers);
    vec2 cur_uv = uv;

    float depth_from_tex = texture2D(tex_depth, cur_uv).r;

    for (int i = 0; i < 32; i++) {
        cur_layer_depth += layer_depth;
        cur_uv -= delta_uv;
        depth_from_tex = texture2D(tex_depth, cur_uv).r;
        if (depth_from_tex < cur_layer_depth) {
            break;
        }
    }

    vec2 prev_uv = cur_uv + delta_uv;
    float next = depth_from_tex - cur_layer_depth;
    float prev = texture2D(tex_depth, prev_uv).r - cur_layer_depth + layer_depth;
    float weight = next / (next - prev);
    return mix(cur_uv, prev_uv, weight);
}

void main(void) {
    vec3 light_dir;
    vec3 view_dir;
    vec2 uv;
    vec3 norm;
    vec3 ambient = vec3(0.77, 0.77, 0.77);
    vec3 sun_color = vec3(0.6, 0.4, 0.2);

    if (hasNormalAndDisplacement == 1.0) {
        light_dir = normalize(ts_light_pos - ts_frag_pos);
        view_dir = normalize(ts_view_pos - ts_frag_pos);

        uv = parallax_uv(frag_uv, view_dir);
        norm = normalize(texture2D(tex_norm, uv).rgb * 2.0 - 1.0);
    } else {
        light_dir = normalize(frag_light_pos);

        uv = frag_uv;
        norm = normalize(frag_norm);
    }

    vec4 albedo = texture2D(tex_diffuse, uv);
    vec3 lightIntensity = max(dot(norm, light_dir), 0.0) * sun_color + ambient;

    gl_FragColor = vec4(albedo.rgb * lightIntensity, albedo.a);
}

`;
