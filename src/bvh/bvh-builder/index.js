/**
 * BVH (Bounding Volume Hierarchy) Iterative Builder
 *
 * Inspired by: Thanassis Tsiodras (ttsiodras on GitHub)
 * https://github.com/ttsiodras/renderer-cuda/blob/master/src/BVH.cpp
 *
 * Edited and Ported from C++ to Javascript by: Erich Loftis (erichlof on GitHub)
 * https://github.com/erichlof/THREE.js-PathTracing-Renderer
 *
 * Cleaned up and made engine agnostic by: Jakob Stasilowicz (stasilo on GitHub)
 */

import { vec3 } from 'gl-matrix';

var stackptr = 0;
var buildNodes = [];
var leftWorkLists = [];
var rightWorkLists = [];
var parentList = [];
var bestSplit = null;
var bestAxis = null;

var rightBranchCounter = 0;
var leftBranchCounter = 0;

var leftWorkCounter = 0;
var rightWorkCounter = 0;

var nullCodePathReached = false;

var currentMinCorner = vec3.create();
var currentMaxCorner = vec3.create();

var testMinCorner = vec3.create();
var testMaxCorner = vec3.create();
var testCentroid = vec3.create();

var currentCentroid = vec3.create();
var centroidAverage = vec3.create();

var lBottomCorner = vec3.create();
var lTopCorner = vec3.create();
var rBottomCorner = vec3.create();
var rTopCorner = vec3.create();

var k, value, side1, side2, side3, minCost, testSplit;
var axis, countLeft, countRight;
var lside1, lside2, lside3, rside1, rside2, rside3;
var surfaceLeft, surfaceRight, totalCost;
var currentList;


export function BvhFlatNode() {
    this.idSelf = 0;
    this.idLeftChild = 0;
    this.idRightChild = 0;
    this.idParent = 0;
    this.minCorner = vec3.create();
    this.maxCorner = vec3.create();
}

export function bvhCreateNode(workList, aabbArray, idParent, isLeftBranch) {
    // reset variables
    currentMinCorner = vec3.fromValues(Infinity, Infinity, Infinity);
    currentMaxCorner = vec3.fromValues(-Infinity, -Infinity, -Infinity);

    if (workList.length < 1) {
        return;
    } else if (workList.length == 1) {
        //console.log("worklist.length = 1 code path reached");

        k = workList[0];
        // create leaf node
        let flatLeafNode = new BvhFlatNode();

        flatLeafNode.idSelf = buildNodes.length;
        flatLeafNode.idLeftChild = -k - 1; // a negative value signifies leaf node - used as triangle id
        flatLeafNode.idRightChild = -1;
        flatLeafNode.idParent = idParent;

        flatLeafNode.minCorner = vec3.fromValues(
            aabbArray[9 * k + 0],
            aabbArray[9 * k + 1],
            aabbArray[9 * k + 2]
        );

        flatLeafNode.maxCorner = vec3.fromValues(
            aabbArray[9 * k + 3],
            aabbArray[9 * k + 4],
            aabbArray[9 * k + 5]
        );

        buildNodes.push(flatLeafNode);

        // if this is a right branch, fill in parent's missing link to this right child,
        // now that we have assigned this right child an ID
        if (!isLeftBranch) {
            buildNodes[idParent].idRightChild = flatLeafNode.idSelf;
        }

        return;
    } else if (workList.length == 2) { // end else if (workList.length == 1)
        // construct bounding box around the current workList's triangle AABBs
        for (let i = 0; i < workList.length; i++) {
            k = workList[i];

            testMinCorner = vec3.fromValues(
                aabbArray[9 * k + 0],
                aabbArray[9 * k + 1],
                aabbArray[9 * k + 2]
            );

            testMaxCorner = vec3.fromValues(
                aabbArray[9 * k + 3],
                aabbArray[9 * k + 4],
                aabbArray[9 * k + 5]
            );

            vec3.min(currentMinCorner, currentMinCorner, testMinCorner);
            vec3.max(currentMaxCorner, currentMaxCorner, testMaxCorner);
        }

        // create inner node
        let flatnode0 = new BvhFlatNode();

        flatnode0.idSelf = buildNodes.length;
        flatnode0.idLeftChild = buildNodes.length + 1;
        flatnode0.idRightChild = buildNodes.length + 2;
        flatnode0.idParent = idParent;

        flatnode0.minCorner = vec3.clone(currentMinCorner);
        flatnode0.maxCorner = vec3.clone(currentMaxCorner);

        buildNodes.push(flatnode0);

        // if this is a right branch, fill in parent's missing link to this right child,
        // now that we have assigned this right child an ID
        if (!isLeftBranch) {
            buildNodes[idParent].idRightChild = flatnode0.idSelf;
        }

        k = workList[0];

        // create 'left' leaf node
        let flatnode1 = new BvhFlatNode();

        flatnode1.idSelf = buildNodes.length;
        flatnode1.idLeftChild = -k - 1;
        flatnode1.idRightChild = -1;
        flatnode1.idParent = flatnode0.idSelf;

        flatnode1.minCorner = vec3.fromValues(
            aabbArray[9 * k + 0],
            aabbArray[9 * k + 1],
            aabbArray[9 * k + 2]
        );

        flatnode1.maxCorner = vec3.fromValues(
            aabbArray[9 * k + 3],
            aabbArray[9 * k + 4],
            aabbArray[9 * k + 5]
        );

        buildNodes.push(flatnode1);

        k = workList[1];

        // create 'right' leaf node
        let flatnode2 = new BvhFlatNode();

        flatnode2.idSelf = buildNodes.length;
        flatnode2.idLeftChild = -k - 1;
        flatnode2.idRightChild = -1;
        flatnode2.idParent = flatnode0.idSelf;

        flatnode2.minCorner = vec3.fromValues(
            aabbArray[9 * k + 0],
            aabbArray[9 * k + 1],
            aabbArray[9 * k + 2]
        );

        flatnode2.maxCorner = vec3.fromValues(
            aabbArray[9 * k + 3],
            aabbArray[9 * k + 4],
            aabbArray[9 * k + 5]
        );

        buildNodes.push(flatnode2);

        return;
    } else if (workList.length > 2) { // end else if (workList.length == 2)
        centroidAverage = vec3.fromValues(0, 0, 0);

        // construct bounding box around all of the current workList's triangle AABBs
        for (let i = 0; i < workList.length; i++) {
            k = workList[i];

            testMinCorner = vec3.fromValues(
                aabbArray[9 * k + 0],
                aabbArray[9 * k + 1],
                aabbArray[9 * k + 2]
            );

            testMaxCorner = vec3.fromValues(
                aabbArray[9 * k + 3],
                aabbArray[9 * k + 4],
                aabbArray[9 * k + 5]
            );

            currentCentroid = vec3.fromValues(
                aabbArray[9 * k + 6],
                aabbArray[9 * k + 7],
                aabbArray[9 * k + 8]
            );

            vec3.min(currentMinCorner, currentMinCorner, testMinCorner);
            vec3.max(currentMaxCorner, currentMaxCorner, testMaxCorner);
            vec3.add(centroidAverage, centroidAverage, currentCentroid);
        }

        // divide each member of centroidAverage by scalar workList.length
        vec3.divide(
            centroidAverage,
            centroidAverage,
            vec3.fromValues(
                ...Array(3).fill(workList.length)
            )
        );

        // create inner node
        let flatnode = new BvhFlatNode();

        flatnode.idSelf = buildNodes.length;
        flatnode.idLeftChild = buildNodes.length + 1; // traverse down the left branches first
        flatnode.idRightChild = 0; // missing link will be filled in soon, don't know how deep the left branches will go
        flatnode.idParent = idParent;
        flatnode.minCorner = vec3.clone(currentMinCorner);
        flatnode.maxCorner = vec3.clone(currentMaxCorner);

        buildNodes.push(flatnode);
        //console.log(flatnode);

        // if this is a right branch, fill in parent's missing link to this right child,
        // now that we have assigned this right child an ID
        if (!isLeftBranch) {
            buildNodes[idParent].idRightChild = flatnode.idSelf;
        }

        side1 = currentMaxCorner[0]
            - currentMinCorner[0]; // length bbox along X-axis
        side2 = currentMaxCorner[1]
            - currentMinCorner[1]; // length bbox along Y-axis
        side3 = currentMaxCorner[2]
            - currentMinCorner[2]; // length bbox along Z-axis

        minCost = workList.length
            * (side1 * side2 + side2 * side3 + side3 * side1);

        // reset bestSplit and bestAxis
        bestSplit = null;
        bestAxis = null;

        // Try all 3 axises X, Y, Z
        for (let j = 0; j < 3; j++) { // 0 = X, 1 = Y, 2 = Z axis
            axis = j;

            // we will try dividing the triangle AABBs based on the current axis
            // create left and right bounding box
            lBottomCorner = vec3.fromValues(Infinity, Infinity, Infinity);
            lTopCorner = vec3.fromValues(-Infinity, -Infinity, -Infinity);
            rBottomCorner = vec3.fromValues(Infinity, Infinity, Infinity);
            rTopCorner = vec3.fromValues(-Infinity, -Infinity, -Infinity);

            // The number of triangle AABBs in the left and right bboxes (needed to calculate SAH cost function)
            countLeft = 0;
            countRight = 0;

            // allocate triangle AABBs in remaining workList list based on their bbox centers
            // this is a fast O(N) pass, no triangle AABB sorting needed (yet)
            for (let i = 0; i < workList.length; i++) {
                k = workList[i];

                testMinCorner = vec3.fromValues(
                    aabbArray[9 * k + 0],
                    aabbArray[9 * k + 1],
                    aabbArray[9 * k + 2]
                );

                testMaxCorner = vec3.fromValues(
                    aabbArray[9 * k + 3],
                    aabbArray[9 * k + 4],
                    aabbArray[9 * k + 5]
                );

                testCentroid = vec3.fromValues(
                    aabbArray[9 * k + 6],
                    aabbArray[9 * k + 7],
                    aabbArray[9 * k + 8]
                );

                // get bbox center
                if (axis == 0) { // x-axis
                    value = testCentroid[0];
                    testSplit = centroidAverage[0];
                } else if (axis == 1) { // y-axis
                    value = testCentroid[1];
                    testSplit = centroidAverage[1];
                } else { // z-axis
                    value = testCentroid[2];
                    testSplit = centroidAverage[2];
                }

                if (value < testSplit) {
                    // if center is smaller then testSplit value, put triangle box in Left bbox
                    vec3.min(lBottomCorner, lBottomCorner, testMinCorner);
                    vec3.max(lTopCorner, lTopCorner, testMaxCorner);
                    countLeft++;
                } else {
                    // else put triangle box in Right bbox
                    vec3.min(rBottomCorner, rBottomCorner, testMinCorner);
                    vec3.max(rTopCorner, rTopCorner, testMaxCorner);
                    countRight++;
                }
            }

            // First, check for bad partitionings, ie bins with 0 triangle AABBs make no sense
            if (countLeft < 1 || countRight < 1) {
                continue;
            }

            // Now use the Surface Area Heuristic to see if this split has a better "cost"
            // It's a real partitioning, calculate the sides of Left and Right BBox
            lside1 = lTopCorner[0] - lBottomCorner[0];
            lside2 = lTopCorner[1] - lBottomCorner[1];
            lside3 = lTopCorner[2] - lBottomCorner[2];

            rside1 = rTopCorner[0] - rBottomCorner[0];
            rside2 = rTopCorner[1] - rBottomCorner[1];
            rside3 = rTopCorner[2] - rBottomCorner[2];

            // calculate SurfaceArea of Left and Right BBox
            surfaceLeft = (lside1 * lside2)
                + (lside2 * lside3)
                + (lside3 * lside1);

            surfaceRight = (rside1 * rside2)
                + (rside2 * rside3)
                + (rside3 * rside1);

            // calculate total cost by multiplying left and right bbox by number of triangle AABBs in each
            totalCost = (surfaceLeft * countLeft)
                + (surfaceRight * countRight);

            // keep track of cheapest split found so far
            if (totalCost < minCost) {
                minCost = totalCost;
                bestSplit = testSplit;
                bestAxis = axis;
            }
        } // end for (let j = 0; j < 3; j++)

        // if no bestSplit was found (bestSplit still equals null), manually populate left/right lists later
        if (bestSplit == null) {
            nullCodePathReached = true;
            //console.log("bestSplit==null code path reached");
            //console.log("workList length: " + workList.length);
        }
    } // end else if (workList.length > 2)

    leftWorkCounter = 0;
    rightWorkCounter = 0;

    // manually populate the current leftWorkLists and rightWorklists
    if (nullCodePathReached) {
        nullCodePathReached = false;

        // this loop is to count how many elements we need for the left branch and the right branch
        for (let i = 0; i < workList.length; i++) {
            if (i % 2 == 0) {
                leftWorkCounter++;
            } else {
                rightWorkCounter++;
            }
        }

        // now that the size of each branch is known, we can initialize the left and right arrays
        leftWorkLists[stackptr] = new Uint32Array(leftWorkCounter);
        rightWorkLists[stackptr] = new Uint32Array(rightWorkCounter);

        // reset counters for the loop coming up
        leftWorkCounter = 0;
        rightWorkCounter = 0;

        for (let i = 0; i < workList.length; i++) {
            k = workList[i];
            if (i % 2 == 0) {
                leftWorkLists[stackptr][leftWorkCounter] = k;
                leftWorkCounter++;
            } else {
                rightWorkLists[stackptr][rightWorkCounter] = k;
                rightWorkCounter++;
            }
        }
        return; // bail out
    }

    // the following code can only be reached if (workList.length > 2) and bestSplit has been successfully set:
    // other branches will 'return;' earlier
    // distribute the triangle AABBs in the left or right child nodes
    leftWorkCounter = 0;
    rightWorkCounter = 0;

    // this loop is to count how many elements we need for the left branch and the right branch
    for (let i = 0; i < workList.length; i++) {
        k = workList[i];

        testCentroid = vec3.fromValues(
            aabbArray[9 * k + 6],
            aabbArray[9 * k + 7],
            aabbArray[9 * k + 8]
        );

        // get bbox center
        if (bestAxis == 0) {
            value = testCentroid[0]; // x-axis
        } else if (bestAxis == 1) { 
            value = testCentroid[1]; // y-axis
        } else {
            value = testCentroid[2]; // z-axis
        }

        if (value < bestSplit) {
            leftWorkCounter++;
        } else {
            rightWorkCounter++;
        }
    }

    // now that the size of each branch is known, we can initialize the left and right arrays
    leftWorkLists[stackptr] = new Uint32Array(leftWorkCounter);
    rightWorkLists[stackptr] = new Uint32Array(rightWorkCounter);

    // reset counters for the loop coming up
    leftWorkCounter = 0;
    rightWorkCounter = 0;

    // populate the current leftWorkLists and rightWorklists
    for (let i = 0; i < workList.length; i++) {
        k = workList[i];

        testCentroid = vec3.fromValues(
            aabbArray[9 * k + 6],
            aabbArray[9 * k + 7],
            aabbArray[9 * k + 8]
        );

        // get bbox center
        if (bestAxis == 0) {
            value = testCentroid[0]; // x-axis
        } else if (bestAxis == 1) {
            value = testCentroid[1]; // y-axis
        } else {
            value = testCentroid[2]; // z-axis
        }

        if (value < bestSplit) {
            leftWorkLists[stackptr][leftWorkCounter] = k;
            leftWorkCounter++;
        } else {
            rightWorkLists[stackptr][rightWorkCounter] = k;
            rightWorkCounter++;
        }
    }
} // end function bvhCreateNode(workList, aabbArray, idParent, isLeftBranch)

export function bvhBuildIterative(workList, aabbArray) {
    currentList = workList;
    //console.log("building root with " + currentList.length + " triangle AABBs");
    //console.log(currentList);

    // reset BVH builder arrays;
    buildNodes = [];
    leftWorkLists = [];
    rightWorkLists = [];
    parentList = [];

    stackptr = 0;
    nullCodePathReached = false;

    parentList.push(buildNodes.length - 1);

    // parent id of -1, meaning this is the root node, which has no parent
    bvhCreateNode(currentList, aabbArray, -1, true); // build root node

    // build the tree using the "go down left branches until done, then ascend back up right branches" approach
    while (stackptr > -1) {
        // pop the next node off the stack
        currentList = leftWorkLists[stackptr];
        leftWorkLists[stackptr] = null;

        if (currentList != undefined) {
            //console.log("building left with " + currentList.length + " triangle AABBs");
            //console.log(currentList);
            stackptr++;
            //console.log("stackptr: " + stackptr);
            parentList.push(buildNodes.length - 1);
            // build the left node
            bvhCreateNode(currentList, aabbArray, buildNodes.length - 1, true);
            leftBranchCounter++;
        } else {
            currentList = rightWorkLists[stackptr];

            if (currentList != undefined) {
                //console.log("building right with " + currentList.length + " triangle AABBs");
                //console.log(currentList);
                stackptr++;
                //console.log("stackptr: " + stackptr);

                // build the right node
                bvhCreateNode(currentList, aabbArray, parentList.pop(), false);
                rightWorkLists[stackptr - 1] = null;
                rightBranchCounter++;
            } else {
                stackptr--;
                //console.log("stackptr: " + stackptr);
            }
        }
    } // end while (stackptr > -1)

    return buildNodes;
} // end function bvhBuildIterative(workList, aabbArray)
