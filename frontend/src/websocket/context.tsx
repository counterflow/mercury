import React, { createContext } from "react";
import { useDispatch } from "react-redux";
import { getSelectedNotebook } from "../components/Notebooks/notebooksSlice";
import {
  setNotebookSrc,
  setWebSocketStatus,
  setWorkerStatus,
  WebSocketStatus,
  WorkerStatus,
} from "./wsSlice";

import { useSelector } from "react-redux";
import { getSessionId } from "../utils";

const WebSocketContext = createContext(undefined as any);

export { WebSocketContext };

export default function WebSocketProvider({
  children,
}: {
  children: JSX.Element;
}) {
  const dispatch = useDispatch();
  const selectedNotebook = useSelector(getSelectedNotebook);

  console.log("WebSocketProvider");
  let connection: WebSocket | undefined = undefined;
  let ws = null;

  const sendMessage = (payload: string) => {
    if (connection !== undefined && connection.readyState === connection.OPEN) {
      connection.send(payload);
    }
  };

  function onOpen(event: any): void {
    dispatch(setWebSocketStatus(WebSocketStatus.Connected));
    ping();
  }
  function onMessage(event: any): void {
    console.log("reveived from server", event.data);

    const response = JSON.parse(event.data);
    if ("purpose" in response) {
      if (response.purpose === "worker-state") {
        dispatch(setWorkerStatus(response.state));
      } else if (response.purpose === "executed-notebook") {
        dispatch(setNotebookSrc(response.body));
      }
    }
  }
  
  function onError(event: any): void {
    dispatch(setWebSocketStatus(WebSocketStatus.Disconnected));
    dispatch(setWorkerStatus(WorkerStatus.Unknown));
  }

  function onClose(event: any): void {
    dispatch(setWebSocketStatus(WebSocketStatus.Disconnected));
    dispatch(setWorkerStatus(WorkerStatus.Unknown));
    connection = undefined;
    setTimeout(() => connect(), 5000);
  }

  function ping(): void {
    sendMessage(
      JSON.stringify({
        purpose: "worker-ping",
      })
    );
    if (connection !== undefined && connection.readyState === connection.OPEN) {
      setTimeout(() => ping(), 5000);
    }
  }

  function connect() {
    if (
      selectedNotebook !== undefined &&
      selectedNotebook.id !== undefined &&
      connection === undefined
    ) {
      dispatch(setWebSocketStatus(WebSocketStatus.Connecting));
      connection = new WebSocket(
        `ws://127.0.0.1:8000/ws/client/${
          selectedNotebook.id
        }/${getSessionId()}/`
      );
      connection.onopen = onOpen;
      connection.onmessage = onMessage;
      connection.onerror = onError;
      connection.onclose = onClose;
    }
  }
  connect();

  ws = {
    sendMessage,
  };

  return (
    <WebSocketContext.Provider value={ws}>{children}</WebSocketContext.Provider>
  );
}
