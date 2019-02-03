#version 300 es

layout(location=0) in vec2 position;
out vec2 uv;

void main() {
    uv = position;
    gl_Position = vec4(2.0 * position - 1.0, 0, 1);
}
