import {defined, definedNotNull} from '../../utils';

class TextureList {
    elements = [];

    constructor(textures) {
        this.elements = definedNotNull(textures)
            ? textures
                .map((texture, i) => {
                    texture.id = i;
                    return texture;
                })
            : [];
    }

    addTexture(texture) {
        texture.id = this.elements.length + 1;
        this.elements
            .concat(texture);
    }

    getTextures() {
        return this.elements; //.map(el => el.texture);
    }

    get length() {
        return this.elements.length;
    }

    // getTextureData() {
    //     return this.elements
    //         .reduce((flatTextures, texture) => [
    //             ...flatTextures,
    //             ...texture.toArray()
    //         ], []);
    // }
}

export default TextureList;
