import ObjModel from '../obj-model';

class Diamond {
    constructor(opts) {
        // "await new Obj()"
        return (async () => {
            return new ObjModel({
                url: 'assets/primitives/diamond.obj',
                smoothShading: false,
                doubleSided: true,
                ...opts
            });
        })();
    }
}

export default Diamond
