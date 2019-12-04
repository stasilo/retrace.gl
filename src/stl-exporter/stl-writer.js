
// Cribbed from http://buildaweso.me/project/2014/10/26/writing-binary-stl-files-from-threejs-objects

import FileSaver from 'filesaver.js';

var STLWriter = function() {}

STLWriter.prototype = {

    writeVector: function(dataview, offset, vector, isLittleEndian) {
        offset = this.writeFloat(dataview, offset, vector[0], isLittleEndian);
        offset = this.writeFloat(dataview, offset, vector[1], isLittleEndian);
        return this.writeFloat(dataview, offset, vector[2], isLittleEndian);
    },

    writeFloat: function(dataview, offset, float, isLittleEndian) {
        dataview.setFloat32(offset, float, isLittleEndian);
        return offset + 4;
    },

    calcNormal: function(face) {
        var a = face[0];
        var b = face[1];
        var c = face[2];
        var normal = [];
        normal[0] = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
        normal[1] = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
        normal[2] = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        return normal;
    },

    geometryToDataView: function(faces, len) {
        var isLittleEndian = true; // STL files assume little endian, see wikipedia page

        var bufferSize = 84 + (50 * len);
        var buffer = new ArrayBuffer(bufferSize);
        var dv = new DataView(buffer);
        var offset = 0;

        offset += 80; // Header is empty

        dv.setUint32(offset, len, isLittleEndian);
        offset += 4;
        var face = [];

        for(var n = 0; n < len; n++) {
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
    },

    save: function(faces, len, filename) {
        var dv = this.geometryToDataView(faces, len);
        var blob = new Blob([dv], {type: 'application/octet-binary'});
        FileSaver.saveAs(blob, filename);
    }
};

export default STLWriter;
