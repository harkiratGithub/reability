// // import * as posenet from '@tensorflow-models/posenet';
// import { BodyPartEnum } from './models/skeleton';

// export const drawKeypoints = (keypoints, minConfidence, ctx, scale = 1, color) => {
//     for (let i = 0; i < keypoints.length; i++) {
//         const keypoint = keypoints[i];

//         if (keypoint.score < minConfidence || (i >= 1 && i <= 4)) {
//             continue;
//         }
//         const { y, x } = keypoint.position;
//         drawPoint(ctx, y * scale, x * scale, 3, color);
//     }
// }

// export const drawHeadAndShouldersHandsKeypoints = (keypoints, minConfidence, ctx, scale = 1, color) => {
//     keypoints = keypoints.filter(keyPoint =>
//         keyPoint.part === "nose" ||
//         keyPoint.part === "leftShoulder" ||
//         keyPoint.part === "rightShoulder" ||
//         keyPoint.part === "leftWrist" ||
//         keyPoint.part === "rightWrist"
//     );
//     for (let i = 0; i < keypoints.length; i++) {
//         const keypoint = keypoints[i];
//         const { y, x } = keypoint.position;
//         drawPoint(ctx, y * scale, x * scale, 3, color);
//     }
// }

// export const drawPoint = (ctx, y, x, r, color) => {
//     ctx.beginPath();
//     ctx.arc(x, y, r, 0, 2 * Math.PI);
//     ctx.fillStyle = color;
//     ctx.fill();
// }

// export const drawSkeleton = (keypoints, minConfidence, ctx, scale = 1, color, lineWidth) => {
//     const adjacentKeyPoints =
//         posenet.getAdjacentKeyPoints(keypoints, minConfidence);

//     adjacentKeyPoints.forEach((keypoints) => {
//         drawSegment(
//             toTuple(keypoints[0].position), toTuple(keypoints[1].position), color,
//             scale, ctx, lineWidth);
//     });
// }

// export const drawSegment = (posA, posB, color, scale, ctx, lineWidth) => {
//     ctx.beginPath();
//     ctx.moveTo(posA[1] * scale, posA[0] * scale);
//     ctx.lineTo(posB[1] * scale, posB[0] * scale);
//     ctx.lineWidth = lineWidth;
//     ctx.strokeStyle = color;
//     ctx.stroke();
// }

// export const toTuple = ({ y, x }) => {
//     return [y, x];
// }

// export const drawDepthCameraSkeletonJoints = (skeleton_buffer, ctx, scale = 1, KeyPointColor, shouldScaleSkeleton = true) => {
//     let bodyPartPos;
//     const updated_buffer = scaleBufferToCanvas(skeleton_buffer, shouldScaleSkeleton);

//     for (let item in BodyPartEnum) {
//         if (!isNaN(Number(item))) {
//             bodyPartPos = getBodyPart(updated_buffer, Number(item));
//             if (bodyPartPos && bodyPartPos.x !== 0 && bodyPartPos.y !== 0) {
//                 drawPoint(ctx, bodyPartPos.y * scale, bodyPartPos.x * scale, 6, KeyPointColor);
//             }
//         }
//     }
// }

// export const connectJointsDepthCameraSkeleton = (ctx, skeleton_buffer, color, lineWidth, shouldScaleSkeleton = true) => {

//     const updated_buffer = scaleBufferToCanvas(skeleton_buffer, shouldScaleSkeleton);
//     // connect head -> neck -> shoulder_spine -> spine -> base_spine
//     connectHeadToBaseSpine(ctx, updated_buffer, color, lineWidth);
//     // connect base_spine -> right_hip -> right_knee -> right_foot
//     connectBaseSpineToRightFoot(ctx, updated_buffer, color, lineWidth);
//     // connect base_spine -> left_hip -> left_knee -> left_foot
//     connectBaseSpineToLeftFoot(ctx, updated_buffer, color, lineWidth);
//     // connect shoulder_spine -> right_shoulder -> right_elbow -> right_hand
//     connectShoulderSpineToRightHand(ctx, updated_buffer, color, lineWidth);
//     // connect shoulder_spine -> right_shoulder -> right_elbow -> right_hand
//     connectShoulderSpineToLeftHand(ctx, updated_buffer, color, lineWidth);

// }

// const connectShoulderSpineToLeftHand = (ctx, skeleton_buffer, color, lineWidth) => {
//     const headToBasePos = [];
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.SHOULDER_SPINE));
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.LEFT_SHOULDER));
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.LEFT_ELBOW));
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.LEFT_HAND));

//     drawSelectedSegments(headToBasePos, color, ctx, lineWidth);
// }

// const connectShoulderSpineToRightHand = (ctx, skeleton_buffer, color, lineWidth) => {
//     const headToBasePos = [];
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.SHOULDER_SPINE));
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.RIGHT_SHOULDER));
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.RIGHT_ELBOW));
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.RIGHT_HAND));

//     drawSelectedSegments(headToBasePos, color, ctx, lineWidth);
// }

// const connectBaseSpineToLeftFoot = (ctx, skeleton_buffer, color, lineWidth) => {
//     const headToBasePos = [];
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.BASE_SPINE));
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.LEFT_HIP));
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.LEFT_KNEE));
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.LEFT_FOOT));

//     drawSelectedSegments(headToBasePos, color, ctx, lineWidth);
// }

// const connectHeadToBaseSpine = (ctx, skeleton_buffer, color, lineWidth) => {
//     const headToBasePos = [];
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.HEAD));
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.NECK));
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.SHOULDER_SPINE));
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.SPINE));
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.BASE_SPINE));

//     drawSelectedSegments(headToBasePos, color, ctx, lineWidth);
// }

// const connectBaseSpineToRightFoot = (ctx, skeleton_buffer, color, lineWidth) => {
//     const headToBasePos = [];
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.BASE_SPINE));
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.RIGHT_HIP));
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.RIGHT_KNEE));
//     headToBasePos.push(getBodyPart(skeleton_buffer, BodyPartEnum.RIGHT_FOOT));

//     drawSelectedSegments(headToBasePos, color, ctx, lineWidth);
// }

// const drawSelectedSegments = (headToBasePos, color, ctx, lineWidth) => {
//     for (let i = 0; i < headToBasePos.length - 1; i++) {
//         if (!(headToBasePos[i].x === 0 && headToBasePos[i].y === 0) && !(headToBasePos[i + 1].x === 0
//             && headToBasePos[i + 1].y === 0)) {
//             drawSegment(
//                 toTuple(headToBasePos[i]), toTuple(headToBasePos[i + 1]), color,
//                 1, ctx, lineWidth);
//         }
//     }
// }

// const scaleBufferToCanvas = (skeleton_buffer, shouldScaleSkeleton) => {
//     const updated_buffer = new Int32Array(skeleton_buffer).slice(0);
//     const w = window.innerWidth;
//     const h = window.innerHeight;
//     for (let i = 1; i < 56; i += 3) {
//         // if (shouldScaleSkeleton) {
//         updated_buffer[i] = updated_buffer[i] / 10;
//         updated_buffer[i + 1] = updated_buffer[i + 1] / 10;
//         updated_buffer[i] = (updated_buffer[i] / 640) * 257;
//         updated_buffer[i + 1] = (updated_buffer[i + 1] / 480) * 200;
//         // } else {
//         //     updated_buffer[i] = (updated_buffer[i] / w) * updated_buffer[58];
//         //     updated_buffer[i + 1] = (updated_buffer[i + 1] / h) * updated_buffer[59];

//         //     updated_buffer[i] = (updated_buffer[i] / 640) * 257;
//         //     updated_buffer[i + 1] = (updated_buffer[i + 1] / 480) * 200;
//         // }

//     }
//     return updated_buffer;
// }

// const getBodyPart = (skeleton_buffer, bodyPart) => {
//     let position;
//     switch (bodyPart) {
//         case BodyPartEnum.HEAD:
//             position = { y: skeleton_buffer[2], x: skeleton_buffer[1] };
//             break;
//         case BodyPartEnum.NECK:
//             position = { y: skeleton_buffer[5], x: skeleton_buffer[4] };
//             break;
//         case BodyPartEnum.SHOULDER_SPINE:
//             position = { y: skeleton_buffer[11], x: skeleton_buffer[10] };
//             break;
//         case BodyPartEnum.SPINE:
//             position = { y: skeleton_buffer[14], x: skeleton_buffer[13] };
//             break;
//         case BodyPartEnum.BASE_SPINE:
//             position = { y: skeleton_buffer[41], x: skeleton_buffer[40] };
//             break;
//         case BodyPartEnum.LEFT_ELBOW:
//             position = { y: skeleton_buffer[23], x: skeleton_buffer[22] };
//             break;
//         case BodyPartEnum.LEFT_HAND:
//             position = { y: skeleton_buffer[29], x: skeleton_buffer[28] };
//             break;
//         case BodyPartEnum.RIGHT_ELBOW:
//             position = { y: skeleton_buffer[26], x: skeleton_buffer[25] };
//             break;
//         case BodyPartEnum.RIGHT_HAND:
//             position = { y: skeleton_buffer[32], x: skeleton_buffer[31] };
//             break;
//         case BodyPartEnum.LEFT_HIP:
//             position = { y: skeleton_buffer[44], x: skeleton_buffer[43] };
//             break;
//         case BodyPartEnum.LEFT_KNEE:
//             position = { y: skeleton_buffer[35], x: skeleton_buffer[34] };
//             break;
//         case BodyPartEnum.LEFT_FOOT:
//             position = { y: skeleton_buffer[47], x: skeleton_buffer[46] };
//             break;
//         case BodyPartEnum.RIGHT_HIP:
//             position = { y: skeleton_buffer[50], x: skeleton_buffer[49] };
//             break;
//         case BodyPartEnum.RIGHT_KNEE:
//             position = { y: skeleton_buffer[38], x: skeleton_buffer[37] };
//             break;
//         case BodyPartEnum.RIGHT_FOOT:
//             position = { y: skeleton_buffer[53], x: skeleton_buffer[52] };
//             break;
//         case BodyPartEnum.LEFT_SHOULDER:
//             position = { y: skeleton_buffer[17], x: skeleton_buffer[16] };
//             break;
//         case BodyPartEnum.RIGHT_SHOULDER:
//             position = { y: skeleton_buffer[20], x: skeleton_buffer[19] };
//             break;
//         default: break;
//     }
//     return position;
// }