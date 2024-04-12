import { communicationUtil } from 'src/app/common/services/communication_util.service';

export const swapWithFirstElm = (array, elmIndex) => {
    const temp = array[0];
    array[0] = array[elmIndex];
    array[elmIndex] = temp;
    return array;
}

export const handleGameLobbyStateMessage = (connectedPaitents, data, conn) => {
    const currConnectionItem = connectedPaitents.find(
        connPatient => connPatient.connection == conn
    );
    if (currConnectionItem) {
        currConnectionItem.options_menu_state = data.payload.state;
        currConnectionItem.options_menu_state = Object.assign(
            {},
            currConnectionItem.options_menu_state
        );
    }
    return connectedPaitents;
}

export const handleGameIframeStateMessage = (data, msg, iframeEl) => {
    if (iframeEl && iframeEl.nodeName === 'IFRAME') {
        communicationUtil.sendMessageToIframe(iframeEl, data.payload, msg);
    }
}

export const handlePatientsGamesMessage = (connectedPaitents, data, conn) => {
    const currConnectionItem = connectedPaitents.find(
        connPatient => connPatient.connection === conn
    );
    if (currConnectionItem && currConnectionItem.options_menu_state) {
        currConnectionItem.options_menu_state.patients_game = data.payload;
        currConnectionItem.options_menu_state = Object.assign(
            {},
            currConnectionItem.options_menu_state
        );
    }
    return connectedPaitents;
}

export const handleSkeletonBufferOnIframe = (iframeEl, data, msg) => {
    communicationUtil.sendMessageToIframe(
        iframeEl,
        new Uint32Array(data.payload),
        msg
    );
}

export const handleSkeletonBufferOnLobbyMessage = (connectedPaitents, data, conn) => {
    const currConnectionItem = connectedPaitents.find(
        connPatient => connPatient.connection === conn
    );
    if (currConnectionItem && currConnectionItem.options_menu_state) {
        currConnectionItem.options_menu_state.skeletonBuffer = data.payload ? new Uint32Array(data.payload) : undefined;
        currConnectionItem.options_menu_state = Object.assign(
            {},
            currConnectionItem.options_menu_state
        );
        currConnectionItem.bodyTrackingLoading = false;
    }
    return connectedPaitents;
}

export const removeElementById = (array, id) => {
    return array.filter(
        iframeElement => iframeElement.id !== id
    );
}

