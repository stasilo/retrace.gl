import {
    defined,
    definedNotNull,
    flatten
} from '../../utils';

class TextureList {
    elements = [];

    constructor(textures) {
        return (async () => {
            // wait for promises in dim 0 of array
            let elements = await Promise.all(textures);
            // flatten array & wait for promises that were nested
            elements = await Promise.all(flatten(elements));

            this.elements = definedNotNull(elements)
                ? elements
                    .map((texture, i) => {
                        texture.id = i;
                        return texture;
                    })
                : [];

            return this;
        })();
    }

    addTexture(texture) {
        texture.id = this.elements.length + 1;
        this.elements
            .concat(texture);
    }

    getTextures() {
        return this.elements;
    }

    get length() {
        return this.elements.length;
    }
}

export default TextureList;
