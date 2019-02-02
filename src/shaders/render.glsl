#version 300 es
precision highp float;

uniform sampler2D traceTexture;

out vec4 fragColor; 
in vec2 uv;

void main() {
    vec3 accumSamples = texture(traceTexture, uv).rgb;
    fragColor = vec4(accumSamples, 1.);
}
