// Socket 事件类型
export var SocketEvents;
(function (SocketEvents) {
    // 连接
    SocketEvents["CONNECT"] = "connect";
    SocketEvents["DISCONNECT"] = "disconnect";
    // 房间
    SocketEvents["CREATE_ROOM"] = "room:create";
    SocketEvents["JOIN_ROOM"] = "room:join";
    SocketEvents["LEAVE_ROOM"] = "room:leave";
    SocketEvents["ROOM_UPDATED"] = "room:updated";
    SocketEvents["PLAYER_JOINED"] = "room:playerJoined";
    SocketEvents["PLAYER_LEFT"] = "room:playerLeft";
    // 游戏
    SocketEvents["GAME_START"] = "game:start";
    SocketEvents["GAME_STATE"] = "game:state";
    SocketEvents["PLAY_CARD"] = "game:playCard";
    SocketEvents["DRAW_CARD"] = "game:drawCard";
    SocketEvents["CALL_UNO"] = "game:callUno";
    SocketEvents["CHALLENGE_UNO"] = "game:challengeUno";
    SocketEvents["JUMP_IN"] = "game:jumpIn";
    SocketEvents["TURN_TIMEOUT"] = "game:turnTimeout";
    // AI
    SocketEvents["ADD_AI"] = "ai:add";
    SocketEvents["REMOVE_AI"] = "ai:remove";
    // 错误
    SocketEvents["ERROR"] = "error";
})(SocketEvents || (SocketEvents = {}));
//# sourceMappingURL=index.js.map