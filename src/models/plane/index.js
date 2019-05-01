import ObjModel from '../obj-model';

class Plane {
    constructor(opts) {
        // "await new Obj()"
        return (async () => {
            return new ObjModel({
                url: 'assets/primitives/plane.obj',
                smoothShading: true,
                doubleSided: true,
                ...opts
            });
        })();
    }
}

export default Plane;
