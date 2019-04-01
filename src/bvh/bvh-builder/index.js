/**
 * BVH (Bounding Volume Hierarchy) Iterative Builder
 *
 * Inspired by: Thanassis Tsiodras (ttsiodras on GitHub)
 * https://github.com/ttsiodras/renderer-cuda/blob/master/src/BVH.cpp
 *
 * Edited and Ported from C++ to Javascript by: Erich Loftis (erichlof on GitHub)
 * https://github.com/erichlof/THREE.js-PathTracing-Renderer
 *
 */

import { Vector3 } from 'three';

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

var currentMinCorner = new Vector3();
var currentMaxCorner = new Vector3();

var testMinCorner = new Vector3();
var testMaxCorner = new Vector3();
var testCentroid = new Vector3();

var currentCentroid = new Vector3();
var centroidAverage = new Vector3();

var lBottomCorner = new Vector3();
var lTopCorner = new Vector3();
var rBottomCorner = new Vector3();
var rTopCorner = new Vector3();

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
    this.minCorner = new Vector3();
    this.maxCorner = new Vector3();
}

export function BvhCreateNode(workList, aabb_array, idParent, isLeftBranch) {
    // reset variables
    currentMinCorner.set(Infinity, Infinity, Infinity);
    currentMaxCorner.set(-Infinity, -Infinity, -Infinity);

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

        flatLeafNode.minCorner.set(aabb_array[9 * k + 0], aabb_array[9 * k + 1], aabb_array[9 * k + 2]);
        flatLeafNode.maxCorner.set(aabb_array[9 * k + 3], aabb_array[9 * k + 4], aabb_array[9 * k + 5]);

        buildNodes.push(flatLeafNode);

        //console.log(flatLeafNode);
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
            testMinCorner.set(aabb_array[9 * k + 0], aabb_array[9 * k + 1], aabb_array[9 * k + 2]);
            testMaxCorner.set(aabb_array[9 * k + 3], aabb_array[9 * k + 4], aabb_array[9 * k + 5]);

            currentMinCorner.min(testMinCorner);
            currentMaxCorner.max(testMaxCorner);
        }

        // create inner node
        let flatnode0 = new BvhFlatNode();

        flatnode0.idSelf = buildNodes.length;
        flatnode0.idLeftChild = buildNodes.length + 1;
        flatnode0.idRightChild = buildNodes.length + 2;
        flatnode0.idParent = idParent;

        flatnode0.minCorner.copy(currentMinCorner);
        flatnode0.maxCorner.copy(currentMaxCorner);

        buildNodes.push(flatnode0);
        //console.log(flatnode0);

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

        flatnode1.minCorner.set(aabb_array[9 * k + 0], aabb_array[9 * k + 1], aabb_array[9 * k + 2]);
        flatnode1.maxCorner.set(aabb_array[9 * k + 3], aabb_array[9 * k + 4], aabb_array[9 * k + 5]);

        buildNodes.push(flatnode1);

        //console.log(flatnode1);
        k = workList[1];

        // create 'right' leaf node
        let flatnode2 = new BvhFlatNode();

        flatnode2.idSelf = buildNodes.length;
        flatnode2.idLeftChild = -k - 1;
        flatnode2.idRightChild = -1;
        flatnode2.idParent = flatnode0.idSelf;

        flatnode2.minCorner.set(aabb_array[9 * k + 0], aabb_array[9 * k + 1], aabb_array[9 * k + 2]);
        flatnode2.maxCorner.set(aabb_array[9 * k + 3], aabb_array[9 * k + 4], aabb_array[9 * k + 5]);

        buildNodes.push(flatnode2);
        //console.log(flatnode2);
        return;
    } else if (workList.length > 2) { // end else if (workList.length == 2)
        centroidAverage.set(0, 0, 0);

        // construct bounding box around all of the current workList's triangle AABBs
        for (let i = 0; i < workList.length; i++) {
            k = workList[i];
            testMinCorner.set(aabb_array[9 * k + 0], aabb_array[9 * k + 1], aabb_array[9 * k + 2]);
            testMaxCorner.set(aabb_array[9 * k + 3], aabb_array[9 * k + 4], aabb_array[9 * k + 5]);

            currentCentroid.set(aabb_array[9 * k + 6], aabb_array[9 * k + 7], aabb_array[9 * k + 8]);

            currentMinCorner.min(testMinCorner);
            currentMaxCorner.max(testMaxCorner);

            centroidAverage.add(currentCentroid);
        }

        centroidAverage.divideScalar(workList.length);
        // create inner node
        let flatnode = new BvhFlatNode();

        flatnode.idSelf = buildNodes.length;
        flatnode.idLeftChild = buildNodes.length + 1; // traverse down the left branches first
        flatnode.idRightChild = 0; // missing link will be filled in soon, don't know how deep the left branches will go
        flatnode.idParent = idParent;

        flatnode.minCorner.copy(currentMinCorner);
        flatnode.maxCorner.copy(currentMaxCorner);

        buildNodes.push(flatnode);
        //console.log(flatnode);

        // if this is a right branch, fill in parent's missing link to this right child,
        // now that we have assigned this right child an ID
        if (!isLeftBranch) {
            buildNodes[idParent].idRightChild = flatnode.idSelf;
        }

        side1 = currentMaxCorner.x - currentMinCorner.x; // length bbox along X-axis
        side2 = currentMaxCorner.y - currentMinCorner.y; // length bbox along Y-axis
        side3 = currentMaxCorner.z - currentMinCorner.z; // length bbox along Z-axis
        minCost = workList.length * (side1 * side2 + side2 * side3 + side3 * side1);

        // reset bestSplit and bestAxis
        bestSplit = null;
        bestAxis = null;

        // Try all 3 axises X, Y, Z
        for (let j = 0; j < 3; j++) { // 0 = X, 1 = Y, 2 = Z axis
            axis = j;

            // we will try dividing the triangle AABBs based on the current axis
            // create left and right bounding box
            lBottomCorner.set(Infinity, Infinity, Infinity);
            lTopCorner.set(-Infinity, -Infinity, -Infinity);
            rBottomCorner.set(Infinity, Infinity, Infinity);
            rTopCorner.set(-Infinity, -Infinity, -Infinity);

            // The number of triangle AABBs in the left and right bboxes (needed to calculate SAH cost function)
            countLeft = 0;
            countRight = 0;

            // allocate triangle AABBs in remaining workList list based on their bbox centers
            // this is a fast O(N) pass, no triangle AABB sorting needed (yet)
            for (let i = 0; i < workList.length; i++) {
                k = workList[i];

                testMinCorner.set(aabb_array[9 * k + 0], aabb_array[9 * k + 1], aabb_array[9 * k + 2]);
                testMaxCorner.set(aabb_array[9 * k + 3], aabb_array[9 * k + 4], aabb_array[9 * k + 5]);
                testCentroid.set(aabb_array[9 * k + 6], aabb_array[9 * k + 7], aabb_array[9 * k + 8]);

                // get bbox center
                if (axis == 0) { // x-axis
                    value = testCentroid.x;
                    testSplit = centroidAverage.x;
                } else if (axis == 1) { // y-axis
                    value = testCentroid.y;
                    testSplit = centroidAverage.y;
                } else { // z-axis
                    value = testCentroid.z;
                    testSplit = centroidAverage.z;
                }

                if (value < testSplit) {
                    // if center is smaller then testSplit value, put triangle box in Left bbox
                    lBottomCorner.min(testMinCorner);
                    lTopCorner.max(testMaxCorner);
                    countLeft++;
                } else {
                    // else put triangle box in Right bbox
                    rBottomCorner.min(testMinCorner);
                    rTopCorner.max(testMaxCorner);
                    countRight++;
                }
            }

            // First, check for bad partitionings, ie bins with 0 triangle AABBs make no sense
            if (countLeft < 1 || countRight < 1) {
                continue;
            }

            // Now use the Surface Area Heuristic to see if this split has a better "cost"
            // It's a real partitioning, calculate the sides of Left and Right BBox
            lside1 = lTopCorner.x - lBottomCorner.x;
            lside2 = lTopCorner.y - lBottomCorner.y;
            lside3 = lTopCorner.z - lBottomCorner.z;
            rside1 = rTopCorner.x - rBottomCorner.x;
            rside2 = rTopCorner.y - rBottomCorner.y;
            rside3 = rTopCorner.z - rBottomCorner.z;

            // calculate SurfaceArea of Left and Right BBox
            surfaceLeft = (lside1 * lside2) + (lside2 * lside3) + (lside3 * lside1);
            surfaceRight = (rside1 * rside2) + (rside2 * rside3) + (rside3 * rside1);

            // calculate total cost by multiplying left and right bbox by number of triangle AABBs in each
            totalCost = (surfaceLeft * countLeft) + (surfaceRight * countRight);

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
        testCentroid.set(aabb_array[9 * k + 6], aabb_array[9 * k + 7], aabb_array[9 * k + 8]);

        // get bbox center
        if (bestAxis == 0) {
            value = testCentroid.x; // x-axis
        } else if (bestAxis == 1) { 
            value = testCentroid.y; // y-axis
        } else {
            value = testCentroid.z; // z-axis
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
        testCentroid.set(aabb_array[9 * k + 6], aabb_array[9 * k + 7], aabb_array[9 * k + 8]);

        // get bbox center
        if (bestAxis == 0) {
            value = testCentroid.x; // x-axis
        } else if (bestAxis == 1) {
            value = testCentroid.y; // y-axis
        } else {
            value = testCentroid.z; // z-axis
        }

        if (value < bestSplit) {
            leftWorkLists[stackptr][leftWorkCounter] = k;
            leftWorkCounter++;
        } else {
            rightWorkLists[stackptr][rightWorkCounter] = k;
            rightWorkCounter++;
        }
    }
} // end function BvhCreateNode(workList, aabb_array, idParent, isLeftBranch)

export function bvhBuildIterative(workList, aabb_array) {
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
    BvhCreateNode(currentList, aabb_array, -1, true); // build root node

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
            BvhCreateNode(currentList, aabb_array, buildNodes.length - 1, true);
            leftBranchCounter++;
        } else {
            currentList = rightWorkLists[stackptr];

            if (currentList != undefined) {
                //console.log("building right with " + currentList.length + " triangle AABBs");
                //console.log(currentList);
                stackptr++;
                //console.log("stackptr: " + stackptr);

                // build the right node
                BvhCreateNode(currentList, aabb_array, parentList.pop(), false);
                rightWorkLists[stackptr - 1] = null;
                rightBranchCounter++;
            } else {
                stackptr--;
                //console.log("stackptr: " + stackptr);
            }
        }
    } // end while (stackptr > -1)

    return buildNodes;
} // end function BvhBuildIterative(workList, aabb_array)
