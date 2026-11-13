from pydantic import BaseModel, Field


class Message(BaseModel):
    message: str = Field(examples=["Operation completed successfully."])
