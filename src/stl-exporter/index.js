import STLWriter from './stl-writer';

class STLExporter {
    maxVerts = 6000000 * 2;

    constructor() {
        this.writer = new STLWriter();
    }

    startModel(filename) {
        this.part = -1;
        this.filename = filename;
        this.nextPart();
    }

    nextPart() {
        this.part += 1;
        this.vertIndex = -1;
        this.numVerts = 0;
        this.numFaces = 0;
        this.faces = new Float32Array(this.maxVerts);
    }

    addSection(vertices, faces) {
        let f, v1, v2, v3;
        for (let i = 0; i < faces.length; ++i) {
            f = faces[i];
            v1 = vertices[ f[0] ];
            v2 = vertices[ f[1] ];
            v3 = vertices[ f[2] ];
            this.addFace(v1, v2, v3);
        }
    }

    addFace(v1, v2, v3) {
        if (this.numVerts + 9 > this.maxVerts) {
            alert('maxVerts!')
            this.save();
            this.nextPart();
        }

        this.faces[++this.vertIndex] = v1[0];
        this.faces[++this.vertIndex] = v1[1];
        this.faces[++this.vertIndex] = v1[2];
        this.faces[++this.vertIndex] = v2[0];
        this.faces[++this.vertIndex] = v2[1];
        this.faces[++this.vertIndex] = v2[2];
        this.faces[++this.vertIndex] = v3[0];
        this.faces[++this.vertIndex] = v3[1];
        this.faces[++this.vertIndex] = v3[2];

        this.numVerts += 9;
        this.numFaces += 1;
    }

    finishModel() {
        this.save();
        delete this.faces;
    }

    save() {
        let filename = [this.filename, 'part', this.part].join('-') + '.stl';
        this.writer.save(this.faces, this.numFaces, filename);
    }
};

export default STLExporter;
