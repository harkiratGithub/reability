import {CAMERA_FRAME_RATE} from '../../../constants'; 

export const setCameraFrameRate = (stream) => {
    const videoTrack = stream.getVideoTracks()[0];
    const constraints = videoTrack.getConstraints();
    constraints.frameRate = { max: CAMERA_FRAME_RATE }
    videoTrack.applyConstraints(constraints);      
}