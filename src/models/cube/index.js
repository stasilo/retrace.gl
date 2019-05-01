import ObjModel from '../obj-model';

class Cube {
    constructor(opts) {
        // "await new Obj()"
        return (async () => {
            return new ObjModel({
                url: 'assets/primitives/cube.obj',
                smoothShading: false,
                doubleSided: true,
                ...opts
            });
        })();
    }
}

export default Cube;
