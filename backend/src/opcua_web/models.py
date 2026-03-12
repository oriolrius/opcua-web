from pydantic import BaseModel


class ConnectRequest(BaseModel):
    url: str
    security_mode: str = "none"  # "none", "username"
    username: str | None = None
    password: str | None = None


class ConnectionStatus(BaseModel):
    connected: bool
    url: str | None = None


class BrowseNode(BaseModel):
    node_id: str
    browse_name: str
    display_name: str
    node_class: int
    has_children: bool


class NodeAttribute(BaseModel):
    node_id: str
    browse_name: str
    display_name: str
    node_class: str
    value: object | None = None
    data_type: str | None = None
    description: str | None = None
    writable: bool = False
    historizing: bool = False
    access_level: int | None = None
    minimum_sampling_interval: float | None = None
