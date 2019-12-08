
// Originally cribbed from http://buildaweso.me/project/2014/10/26/writing-binary-stl-files-from-threejs-objects
// <add glsl-cubermarch credits here>

import FileSaver from 'filesaver.js';

class STLWriter {
    writeVector(dataview, offset, vector, isLittleEndian) {
        offset = this.writeFloat(dataview, offset, vector[0], isLittleEndian);
        offset = this.writeFloat(dataview, offset, vector[1], isLittleEndian);

        return this.writeFloat(dataview, offset, vector[2], isLittleEndian);
    }

    writeFloat(dataview, offset, float, isLittleEndian) {
        dataview.setFloat32(offset, float, isLittleEndian);
        return offset + 4;
    }

    calcNormal(face) {
        let a = face[0];
        let b = face[1];
        let c = face[2];
        let normal = [];
        normal[0] = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
        normal[1] = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
        normal[2] = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

        return normal;
    }

    geometryToDataView(faces, len) {
        let isLittleEndian = true; // STL files assume little endian, see wikipedia page

        let bufferSize = 84 + (50 * len);
        let buffer = new ArrayBuffer(bufferSize);
        let dv = new DataView(buffer);
        let offset = 0;

        offset += 80; // Header is empty

        dv.setUint32(offset, len, isLittleEndian);
        offset += 4;
        let face = [];

        for(let n = 0; n < len; n++) {
            face[0] = [
                faces[n * 9 + 0],
                faces[n * 9 + 1],
                faces[n * 9 + 2]
            ];
            face[1] = [
                faces[n * 9 + 3],
                faces[n * 9 + 4],
                faces[n * 9 + 5]
            ];
            face[2] = [
                faces[n * 9 + 6],
                faces[n * 9 + 7],
                faces[n * 9 + 8]
            ];

            offset = this.writeVector(dv, offset, this.calcNormal(face), isLittleEndian);
            offset = this.writeVector(dv, offset, face[0], isLittleEndian);
            offset = this.writeVector(dv, offset, face[1], isLittleEndian);
            offset = this.writeVector(dv, offset, face[2], isLittleEndian);
            offset += 2; // unused 'attribute byte count' is a Uint16
        }

        return dv;
    }

    save(faces, len, filename) {
        let dv = this.geometryToDataView(faces, len);
        let blob = new Blob([dv], {type: 'application/octet-binary'});

        FileSaver.saveAs(blob, filename);
    }
};

export default STLWriter;
