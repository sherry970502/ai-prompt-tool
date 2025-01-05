const KIMI_CONFIG = {
    API_URL: 'https://api.moonshot.cn/v1',
    API_KEY: 'sk-zm0m1w18ch6xhDOtwDr8xUVXxadVdfFaW0evA6TxduumArwM'
};

class AIChat {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.currentPrompt = '';
        this.messageHistory = [];
        this.lastRequestTime = 0;
        this.requestInterval = 1000;
        this.prompts = this.loadPrompts();
        this.showDirectory();
    }

    initializeElements() {
        this.promptDirectory = document.getElementById('promptDirectory');
        this.promptList = document.getElementById('promptList');
        this.createNewPromptButton = document.getElementById('createNewPrompt');
        this.backToDirectoryButton = document.getElementById('backToDirectory');
        this.currentPromptName = document.getElementById('currentPromptName');
        
        this.initialModal = document.getElementById('initialModal');
        this.promptForm = document.getElementById('promptForm');
        this.chatInterface = document.getElementById('chatInterface');
        this.chatHistoryElement = document.getElementById('chatHistory');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendMessage');
        this.optimizeButton = document.getElementById('optimizePrompt');
        this.promptEditor = document.getElementById('promptEditor');
        this.copyPromptButton = document.getElementById('copyPrompt');
    }

    bindEvents() {
        this.createNewPromptButton.addEventListener('click', () => this.showCreatePromptModal());
        this.backToDirectoryButton.addEventListener('click', () => this.showDirectory());
        
        this.promptForm.addEventListener('submit', (e) => this.handleInitialPrompt(e));
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.optimizeButton.addEventListener('click', () => this.optimizePrompt());
        this.copyPromptButton.addEventListener('click', () => this.copyPrompt());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    loadPrompts() {
        return JSON.parse(localStorage.getItem('prompts') || '[]');
    }

    savePrompts() {
        localStorage.setItem('prompts', JSON.stringify(this.prompts));
    }

    showDirectory() {
        this.promptDirectory.classList.remove('hidden');
        this.chatInterface.classList.add('hidden');
        this.initialModal.classList.add('hidden');
        this.renderPromptList();
    }

    renderPromptList() {
        this.promptList.innerHTML = '';
        this.prompts.forEach((prompt, index) => {
            const card = document.createElement('div');
            card.className = 'prompt-card';
            card.innerHTML = `
                <h3>${prompt.name}</h3>
                <p>${prompt.purpose}</p>
                <div class="date">${new Date(prompt.createdAt).toLocaleDateString()}</div>
            `;
            card.addEventListener('click', () => this.loadPrompt(index));
            this.promptList.appendChild(card);
        });
    }

    showCreatePromptModal() {
        this.promptDirectory.classList.add('hidden');
        this.initialModal.classList.remove('hidden');
    }

    async handleInitialPrompt(e) {
        e.preventDefault();
        const name = document.getElementById('promptName').value;
        const purpose = document.getElementById('purpose').value;
        const tone = document.getElementById('tone').value;
        const output = document.getElementById('output').value;

        const submitButton = this.promptForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = '生成中...';

        try {
            const initialPrompt = await this.generateInitialPrompt(purpose, tone, output);
            
            this.prompts.push({
                name,
                purpose,
                tone,
                output,
                prompt: initialPrompt,
                createdAt: new Date().toISOString(),
                messageHistory: []
            });
            this.savePrompts();
            
            this.initialModal.classList.add('hidden');
            
            this.loadPrompt(this.prompts.length - 1);
        } catch (error) {
            console.error('生成提示词失败:', error);
            alert(`生成提示词失败: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '生成提示词';
            this.promptForm.reset();
        }
    }

    loadPrompt(index) {
        const prompt = this.prompts[index];
        this.currentPrompt = prompt.prompt;
        this.currentPromptIndex = index;
        this.messageHistory = [...prompt.messageHistory];
        this.currentPromptName.textContent = prompt.name;
        this.promptEditor.textContent = prompt.prompt;
        
        this.chatHistoryElement.innerHTML = '';
        this.messageHistory.forEach(msg => {
            this.addMessage(msg.content, msg.role === 'user' ? 'user' : 'ai');
        });

        this.promptDirectory.classList.add('hidden');
        this.chatInterface.classList.remove('hidden');
    }

    async optimizePrompt() {
        try {
            if (this.messageHistory.length === 0) {
                throw new Error('需要先进行一些对话才能优化提示词');
            }

            const optimizeButton = this.optimizeButton;
            optimizeButton.disabled = true;
            optimizeButton.textContent = '优化中...';

            const optimizedPrompt = await this.getOptimizedPrompt();
            if (!optimizedPrompt) {
                throw new Error('获取优化后的提示词失败');
            }

            this.currentPrompt = optimizedPrompt;
            this.promptEditor.textContent = optimizedPrompt;
            
            this.prompts[this.currentPromptIndex].prompt = optimizedPrompt;
            this.savePrompts();
            
            alert('提示词已成功优化！');
        } catch (error) {
            console.error('优化提示词失败:', error);
            alert(error.message || '优化提示词失败，请确保已经进行了一些对话');
        } finally {
            const optimizeButton = this.optimizeButton;
            if (optimizeButton) {
                optimizeButton.disabled = false;
                optimizeButton.textContent = '优化提示词';
            }
        }
    }

    async getOptimizedPrompt() {
        if (this.messageHistory.length === 0) {
            throw new Error('没有对话历史可供分析');
        }

        try {
            const messages = [
                {
                    role: 'user',
                    content: `作为提示词优化专家，请分析以下对话历史，并优化当前的提示词。

                    当前提示词：
                    ${this.currentPrompt}

                    对话历史：
                    ${this.messageHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

                    请根据以下几点优化提示词：
                    1. 分析用户的实际对话内容和期望得到的回复
                    2. 观察AI回复是否符合用户预期
                    3. 找出当前提示词可能存在的问题或不足
                    4. 补充必要的约束条件或细节要求
                    5. 保持提示词的简洁性和可理解性

                    请直接返回优化后的完整提示词，不要包含任何解释或分析内容。`
                }
            ];

            const response = await this.makeApiRequest(messages);
            if (!response || typeof response !== 'string') {
                throw new Error('获取优化后的提示词失败');
            }

            return response;
        } catch (error) {
            console.error('获取优化后的提示词失败:', error);
            throw error;
        }
    }

    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        this.userInput.value = '';

        try {
            const response = await this.getAIResponse(message);
            this.addMessage(response, 'ai');
            
            this.prompts[this.currentPromptIndex].messageHistory = this.messageHistory;
            this.savePrompts();
        } catch (error) {
            console.error('获取AI回复失败:', error);
            this.addMessage('抱歉，获取回复失败，请重试', 'ai');
        }
    }

    async makeApiRequest(messages) {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.requestInterval) {
            await new Promise(resolve => 
                setTimeout(resolve, this.requestInterval - timeSinceLastRequest)
            );
        }

        try {
            const response = await fetch(`${KIMI_CONFIG.API_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${KIMI_CONFIG.API_KEY}`
                },
                body: JSON.stringify({
                    model: 'moonshot-v1-8k',
                    messages: messages
                })
            });

            this.lastRequestTime = Date.now();

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('请求过于频繁，请稍后再试');
                }
                const errorData = await response.json();
                throw new Error(errorData.error?.message || '请求失败');
            }

            const data = await response.json();
            if (!data.choices?.[0]?.message?.content) {
                throw new Error('API返回数据格式错误');
            }

            return data.choices[0].message.content;
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    }

    async getAIResponse(message) {
        const messages = [
            {
                role: 'system',
                content: this.currentPrompt
            },
            ...this.messageHistory,
            {
                role: 'user',
                content: message
            }
        ];

        const aiResponse = await this.makeApiRequest(messages);
        
        this.messageHistory.push(
            { role: 'user', content: message },
            { role: 'assistant', content: aiResponse }
        );

        return aiResponse;
    }

    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${type}-message`);
        messageDiv.textContent = content;
        this.chatHistoryElement.appendChild(messageDiv);
        this.chatHistoryElement.scrollTop = this.chatHistoryElement.scrollHeight;
    }

    copyPrompt() {
        navigator.clipboard.writeText(this.promptEditor.textContent)
            .then(() => alert('提示词已复制到剪贴板'))
            .catch(err => console.error('复制失败:', err));
    }

    async generateInitialPrompt(purpose, tone, output) {
        try {
            console.log('发送API请求...');
            const messages = [{
                role: 'user',
                content: `作为提示词工程师，请为我生成一个详细的提示词模板。

                用户需求：
                目的：${purpose}
                期望语气风格：${tone}
                期望输出格式：${output}

                请生成一个清晰、具体的提示词，要求：
                1. 提示词应该清晰描述任务要求
                2. 包含具体的风格指导
                3. 明确说明输出格式
                4. 如果需要，可以包含示例说明
                
                请直接给出提示词内容，不要包含任何解释或其他内容。参考示例：
                "请使用 Emoji 风格编辑以下段落，该风格以引人入胜的标题、每个段落中包含表情符号和在末尾添加相关标签为特点。请确保保持原文的意思。"`
            }];

            return await this.makeApiRequest(messages);
        } catch (error) {
            console.error('生成初始提示词失败:', error);
            throw error;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AIChat();
}); 