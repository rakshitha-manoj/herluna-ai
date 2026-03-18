import os
from langchain_core.prompts import PromptTemplate
from langchain_community.chat_models import ChatOpenAI
from typing import List

class RAGService:
    def __init__(self):
        # Placeholder for vector database
        self.knowledge_base = [
            "Luteal phase is characterized by high progesterone and may cause mood swings.",
            "Follicular phase is when estrogen rises, usually leading to higher energy.",
            "Magnesium can help reduce menstrual cramps during the menstrual phase."
        ]
    
    def retrieve_context(self, query: str, user_logs: List[dict]):
        # Simple keyword-based retrieval mock
        relevant_knowledge = [k for k in self.knowledge_base if any(word in k.lower() for word in query.lower().split())]
        
        # Aggregate user logs for context
        log_context = f"User's recent logs: {str(user_logs[-7:])}"
        
        return "\n".join(relevant_knowledge) + "\n" + log_context

    def generate_response(self, query: str, profile: dict, logs: List[dict]):
        context = self.retrieve_context(query, logs)
        
        # This would normally call an LLM (e.g. Gemini via LangChain)
        # For now, we'll structure the prompt for the frontend to use
        prompt = f"""
        Context: {context}
        User Profile: {str(profile)}
        
        Question: {query}
        
        Provide an explainable AI response using the context provided.
        """
        return prompt
