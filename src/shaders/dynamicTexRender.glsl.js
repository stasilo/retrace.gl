const getSource = ({src}) => {
    const isShortHandDef = src.indexOf('renderTexture') === -1;
    const shaderSrc =
    `   #version 300 es

        precision highp float;
        precision highp int;
        precision highp sampler2D;

        #define PI 3.141592653589793

        ${isShortHandDef
            ? `void renderTexture(vec2 uv, out vec4 tColor) {
                   ${src}
               }`
            : src
        }

        in vec2 uv;
        out vec4 fragColor;

        void main () {
            renderTexture(uv, fragColor);
        }
    `;

    return shaderSrc;
}

export default getSource;
