import {
    defined,
    definedNotNull,
} from '../../utils';

class DisplacementList {
    elements = [];

    constructor(displacements) {
        let elements = displacements;

        this.elements = definedNotNull(elements)
            ? elements
                .map((displacement, i) => {
                    const id = i;

                    displacement.id = id;
                    displacement.src = this.getSrc(id, displacement.src);

                    return displacement;
                })
            : [];
    }

    getSrc(id, src) {
        return `
            void displacement${id}(vec3 p, out float dDist) {
                ${src}
            }
       `;
    }

    getDisplacements() {
        return this.elements;
    }

    get length() {
        return this.elements.length;
    }
}

export default DisplacementList;
