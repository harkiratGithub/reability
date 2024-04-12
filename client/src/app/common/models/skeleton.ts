export interface Joint {
    x: number,
    y: number
}

export enum BodyPartEnum {
    HEAD,
    NECK,
    SPINE,
    SHOULDER_SPINE,
    MID_SPINE,
    LEFT_SHOULDER,
    RIGHT_SHOULDER,
    LEFT_ELBOW,
    RIGHT_ELBOW,
    LEFT_HAND,
    RIGHT_HAND,
    BASE_SPINE,
    LEFT_HIP,
    LEFT_KNEE,
    LEFT_FOOT,
    RIGHT_HIP,
    RIGHT_KNEE,
    RIGHT_FOOT,
    LEFT_WRIST,
    RIGHT_WRIST,
    END
}

export enum JointEnum {
    X = 0,
    Y,
    Z
}