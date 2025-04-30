class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 基准分辨率
        this.baseWidth = 800;
        this.baseHeight = 400;
        
        // 设置画布尺寸
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // 缩放比例
        this.scale = 1;
        
        // 加载图片
        this.playerImg = new Image();
        this.playerImg.src = 'player.png';
        
        this.obstacleImg = new Image();
        this.obstacleImg.src = 'obstacle.png';
        
        // 图片加载错误处理
        this.playerImg.onerror = () => {
            console.error("玩家图片加载失败");
            this.playerImg = null;
            this.imageLoaded();
        };
        
        this.obstacleImg.onerror = () => {
            console.error("障碍物图片加载失败");
            this.obstacleImg = null;
            this.imageLoaded();
        };
        
        // 音频状态
        this.audioEnabled = false;
        this.audioContext = null;
        this.audioBuffers = {};
        
        // 音效文件路径
        this.soundFiles = {
            jump: './jump.mp3',
            collision: './collision.mp3'
        };
        
        // 音效加载状态
        this.soundsLoaded = 0;
        this.totalSounds = 2;
        
        // 图片加载状态
        this.imagesLoaded = 0;
        this.totalImages = 2;
        
        this.playerImg.onload = () => this.imageLoaded();
        this.obstacleImg.onload = () => this.imageLoaded();
        
        this.player = {
            x: 100,
            y: this.canvas.height - 100,
            width: 60,
            height: 60,
            jumping: false,
            velocity: 0
        };
        
        this.obstacles = [];
        this.score = 0;
        this.gameSpeed = 5;
        this.gravity = 0.6;
        this.jumpForce = -15;
        this.obstacleInterval = 2000;
        this.lastObstacleTime = 0;
        this.isPaused = false;
        this.isGameOver = false;
        this.gameStarted = false;
        
        // 获取视频背景元素
        this.bgVideo = document.getElementById('bgVideo');
        
        // 添加虚拟按键状态
        this.virtualButtons = {
            pause: { 
                x: this.canvas.width - 160, 
                y: this.canvas.height - 80,
                radius: 40,
                text: '暂停' 
            },
            restart: { 
                x: this.canvas.width - 60,
                y: this.canvas.height - 80,
                radius: 40,
                text: '重启' 
            }
        };
        
        // 触摸状态
        this.touchActive = false;
        
        // 响应式缩放
        this.resizeGame();
        window.addEventListener('resize', () => this.resizeGame());
        
        this.setupEventListeners();
        
        // 设置视频循环时间为20秒
        this.bgVideo.addEventListener('loadedmetadata', () => {
            // 设置视频循环时间为20秒
            this.bgVideo.addEventListener('timeupdate', () => {
                if (this.bgVideo.currentTime >= 20) {
                    this.bgVideo.currentTime = 0;
                }
            });
        });
        
        // 确保视频背景加载完成
        if (this.bgVideo.readyState >= 3) {
            this.startGame();
        } else {
            this.bgVideo.addEventListener('canplay', () => {
                this.startGame();
            });
        }
        
        // 添加音频解锁逻辑
        this.unlockAudio();
        
        // 预加载音效
        this.preloadSounds();
    }
    
    // 预加载音效
    preloadSounds() {
        console.log("开始预加载音效");
        
        // 使用fetch加载音效文件
        Object.entries(this.soundFiles).forEach(([name, url]) => {
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.arrayBuffer();
                })
                .then(arrayBuffer => {
                    console.log(`音效 ${name} 加载成功`);
                    this.audioBuffers[name] = arrayBuffer;
                    this.soundsLoaded++;
                    console.log(`音效加载进度: ${this.soundsLoaded}/${this.totalSounds}`);
                })
                .catch(error => {
                    console.error(`音效 ${name} 加载失败:`, error);
                    this.soundsLoaded++; // 即使加载失败也计数，避免卡住
                });
        });
    }
    
    // 解锁音频的方法
    unlockAudio() {
        console.log("尝试解锁音频");
        
        // 创建一个一次性的事件监听器，用于解锁音频
        const unlockAudio = () => {
            console.log("用户交互，尝试解锁音频");
            
            // 尝试使用Web Audio API
            try {
                // 创建音频上下文
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.audioContext = new AudioContext();
                    console.log("Web Audio API 初始化成功");
                    
                    // 尝试播放一个静音的音频
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    gainNode.gain.value = 0; // 静音
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.start(0);
                    oscillator.stop(0.1);
                    
                    console.log("Web Audio API 测试成功");
                    this.audioEnabled = true;
                }
            } catch (e) {
                console.error("Web Audio API 初始化失败:", e);
            }
            
            // 如果Web Audio API不可用，尝试使用Audio元素
            if (!this.audioEnabled) {
                try {
                    // 创建一个短暂的音频并播放
                    const audio = new Audio();
                    audio.src = this.soundFiles.jump;
                    
                    // 设置音量为0，这样用户不会听到声音
                    audio.volume = 0;
                    
                    // 尝试播放
                    const playPromise = audio.play();
                    
                    if (playPromise !== undefined) {
                        playPromise.then(() => {
                            console.log("Audio元素测试成功");
                            this.audioEnabled = true;
                        }).catch(error => {
                            console.error("Audio元素测试失败:", error);
                        });
                    }
                } catch (e) {
                    console.error("Audio元素测试出错:", e);
                }
            }
            
            // 移除事件监听器
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        };
        
        // 添加事件监听器
        document.addEventListener('click', unlockAudio);
        document.addEventListener('keydown', unlockAudio);
    }
    
    startGame() {
        this.gameLoop();
    }
    
    imageLoaded() {
        this.imagesLoaded++;
        if (this.imagesLoaded === this.totalImages) {
            console.log("所有图片加载完成");
        }
    }
    
    setupEventListeners() {
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.player.jumping && !this.isPaused && !this.isGameOver) {
                this.player.jumping = true;
                this.player.velocity = this.jumpForce;
                this.playJumpSound();
            }
            
            if (e.code === 'KeyS') {
                this.togglePause();
            }
            
            if (e.code === 'KeyR') {
                this.reset();
            }
        });
        
        // 触摸事件
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const pos = this.convertTouchToCanvas(touch.clientX, touch.clientY);
            
            // 检查是否触摸到任何虚拟按键
            let buttonTouched = false;
            for (const [name, button] of Object.entries(this.virtualButtons)) {
                if (this.checkButtonTouch(pos.x, pos.y, button)) {
                    buttonTouched = true;
                    if (name === 'pause') {
                        this.togglePause();
                    } else if (name === 'restart') {
                        this.reset();
                    }
                    break;
                }
            }
            
            // 如果没有触摸到任何按钮，且游戏状态正常，则触发跳跃
            if (!buttonTouched && !this.player.jumping && !this.isPaused && !this.isGameOver) {
                this.player.jumping = true;
                this.player.velocity = this.jumpForce;
                this.playJumpSound();
            }
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touchActive = false;
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.reset();
        });
    }
    
    // 检查触摸点是否在按钮范围内
    checkButtonTouch(x, y, button) {
        // 使用圆形碰撞检测
        const dx = x - button.x;
        const dy = y - button.y;
        return Math.sqrt(dx * dx + dy * dy) <= button.radius;
    }
    
    // 响应式缩放
    resizeGame() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const scale = Math.min(containerWidth / 800, containerHeight / 400);
        
        this.canvas.style.width = (800 * scale) + 'px';
        this.canvas.style.height = (400 * scale) + 'px';
    }
    
    togglePause() {
        if (!this.gameStarted) {
            this.gameStarted = true;
            this.bgVideo.play();
            return;
        }
        
        this.isPaused = !this.isPaused;
        document.getElementById('pauseBtn').textContent = this.isPaused ? '继续(S)' : '暂停(S)';
        
        // 暂停/继续视频背景
        if (this.isPaused) {
            this.bgVideo.pause();
        } else {
            this.bgVideo.play();
        }
    }
    
    createObstacle() {
        const height = 60 + Math.random() * 60;
        this.obstacles.push({
            x: this.canvas.width,
            y: this.canvas.height - height,
            width: 40,
            height: height
        });
    }
    
    update() {
        if (this.isPaused || !this.gameStarted) return;
        
        // 如果游戏已结束，不再更新任何内容
        if (this.isGameOver) return;
        
        // 更新玩家位置
        this.player.velocity += this.gravity;
        this.player.y += this.player.velocity;
        
        // 地面碰撞检测
        if (this.player.y > this.canvas.height - this.player.height) {
            this.player.y = this.canvas.height - this.player.height;
            this.player.jumping = false;
            this.player.velocity = 0;
        }
        
        // 生成障碍物
        const currentTime = Date.now();
        if (currentTime - this.lastObstacleTime > this.obstacleInterval) {
            this.createObstacle();
            this.lastObstacleTime = currentTime;
            this.obstacleInterval = Math.max(1000, 2000 - this.score * 50);
        }
        
        // 更新障碍物位置
        this.obstacles = this.obstacles.filter(obstacle => {
            obstacle.x -= this.gameSpeed;
            
            // 碰撞检测
            if (this.checkCollision(this.player, obstacle)) {
                this.gameOver();
                return true; // 保留导致碰撞的障碍物
            }
            
            // 计分
            if (obstacle.x + obstacle.width < this.player.x && !obstacle.passed) {
                obstacle.passed = true;
                this.score++;
                document.getElementById('scoreValue').textContent = this.score;
            }
            
            return obstacle.x > -obstacle.width;
        });
    }
    
    checkCollision(player, obstacle) {
        // 缩小碰撞检测范围，使游戏更容易
        const collisionMargin = 10; // 碰撞边距，减小碰撞范围
        
        const isColliding = player.x + collisionMargin < obstacle.x + obstacle.width - collisionMargin &&
               player.x + player.width - collisionMargin > obstacle.x + collisionMargin &&
               player.y + collisionMargin < obstacle.y + obstacle.height - collisionMargin &&
               player.y + player.height - collisionMargin > obstacle.y + collisionMargin;
        
        // 如果发生碰撞，播放碰撞音效
        if (isColliding) {
            this.playCollisionSound();
        }
        
        return isColliding;
    }
    
    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制地面
        this.ctx.fillStyle = 'rgba(51, 51, 51, 0.8)';
        this.ctx.fillRect(0, this.canvas.height - 2, this.canvas.width, 2);
        
        // 如果游戏结束，使用保存的状态绘制
        if (this.isGameOver && this.gameOverState) {
            // 绘制障碍物
            if (this.obstacleImg && this.imagesLoaded === this.totalImages) {
                this.gameOverState.obstacles.forEach(obstacle => {
                    this.ctx.drawImage(this.obstacleImg, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                });
            } else {
                this.ctx.fillStyle = '#FF5722';
                this.gameOverState.obstacles.forEach(obstacle => {
                    this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                });
            }
            
            // 绘制玩家
            if (this.playerImg && this.imagesLoaded === this.totalImages) {
                this.ctx.drawImage(this.playerImg, this.gameOverState.player.x, this.gameOverState.player.y, 
                                  this.gameOverState.player.width, this.gameOverState.player.height);
            } else {
                this.ctx.fillStyle = '#4CAF50';
                this.ctx.fillRect(this.gameOverState.player.x, this.gameOverState.player.y, 
                                 this.gameOverState.player.width, this.gameOverState.player.height);
            }
        } else {
            // 正常游戏状态下的绘制
            // 绘制障碍物
            if (this.obstacleImg && this.imagesLoaded === this.totalImages) {
                this.obstacles.forEach(obstacle => {
                    this.ctx.drawImage(this.obstacleImg, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                });
            } else {
                this.ctx.fillStyle = '#FF5722';
                this.obstacles.forEach(obstacle => {
                    this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                });
            }
            
            // 绘制玩家
            if (this.playerImg && this.imagesLoaded === this.totalImages) {
                this.ctx.drawImage(this.playerImg, this.player.x, this.player.y, this.player.width, this.player.height);
            } else {
                this.ctx.fillStyle = '#4CAF50';
                this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
            }
        }
        
        // 如果游戏未开始，显示开始提示
        if (!this.gameStarted) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('按S键开始游戏', this.canvas.width / 2, this.canvas.height / 2);
        }
        
        // 如果游戏暂停，显示暂停文字
        if (this.isPaused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('游戏暂停', this.canvas.width / 2, this.canvas.height / 2);
        }
        
        // 如果游戏结束，显示游戏结束文字
        if (this.isGameOver) {
            // 使用半透明背景，而不是完全不透明的黑色背景
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`游戏结束！得分：${this.score}`, this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '20px Arial';
            this.ctx.fillText('按R键重新开始', this.canvas.width / 2, this.canvas.height / 2 + 40);
        }
        
        // 绘制虚拟按键
        this.drawVirtualButtons();
    }
    
    // 绘制虚拟按键
    drawVirtualButtons() {
        Object.values(this.virtualButtons).forEach(button => {
            // 绘制圆形按钮背景
            this.ctx.beginPath();
            this.ctx.arc(button.x, button.y, button.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.fill();
            
            // 绘制圆形按钮边框
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // 绘制按钮文字
            this.ctx.fillStyle = 'white';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(button.text, button.x, button.y);
        });
    }
    
    gameOver() {
        this.isGameOver = true;
        // 游戏结束时暂停视频背景
        this.bgVideo.pause();
        
        // 确保游戏结束时障碍物仍然可见
        // 不重置障碍物数组，保留当前所有障碍物
        console.log("游戏结束，当前障碍物数量:", this.obstacles.length);
        
        // 记录游戏结束时的状态，用于绘制
        this.gameOverState = {
            player: { ...this.player },
            obstacles: this.obstacles.map(obs => ({ ...obs }))
        };
    }
    
    reset() {
        this.player.y = this.canvas.height - 100;
        this.player.jumping = false;
        this.player.velocity = 0;
        this.obstacles = [];
        this.score = 0;
        this.gameSpeed = 5;
        this.obstacleInterval = 2000;
        this.lastObstacleTime = Date.now();
        this.isPaused = false;
        this.isGameOver = false;
        this.gameStarted = true;
        document.getElementById('scoreValue').textContent = '0';
        document.getElementById('pauseBtn').textContent = '暂停(S)';
        
        // 重置视频背景
        this.bgVideo.currentTime = 0;
        this.bgVideo.play();
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    // 播放跳跃音效的方法
    playJumpSound() {
        if (!this.audioEnabled) {
            console.log("音频未解锁，无法播放跳跃音效");
            return;
        }
        
        try {
            console.log("尝试播放跳跃音效");
            
            // 优先使用Web Audio API
            if (this.audioContext && this.audioBuffers.jump) {
                this.playSoundWithWebAudio('jump');
            } else {
                // 回退到Audio元素
                this.playSoundWithAudioElement('jump');
            }
        } catch (error) {
            console.error("播放跳跃音效出错:", error);
        }
    }
    
    // 播放碰撞音效的方法
    playCollisionSound() {
        if (!this.audioEnabled) {
            console.log("音频未解锁，无法播放碰撞音效");
            return;
        }
        
        try {
            console.log("尝试播放碰撞音效");
            
            // 优先使用Web Audio API
            if (this.audioContext && this.audioBuffers.collision) {
                this.playSoundWithWebAudio('collision');
            } else {
                // 回退到Audio元素
                this.playSoundWithAudioElement('collision');
            }
        } catch (error) {
            console.error("播放碰撞音效出错:", error);
        }
    }
    
    // 使用Web Audio API播放音效
    playSoundWithWebAudio(soundName) {
        if (!this.audioContext || !this.audioBuffers[soundName]) {
            console.error(`无法使用Web Audio API播放${soundName}音效`);
            return;
        }
        
        try {
            // 解码音频数据
            this.audioContext.decodeAudioData(this.audioBuffers[soundName], (buffer) => {
                // 创建音频源
                const source = this.audioContext.createBufferSource();
                source.buffer = buffer;
                
                // 连接到输出
                source.connect(this.audioContext.destination);
                
                // 播放
                source.start(0);
                console.log(`${soundName}音效播放成功(Web Audio API)`);
            }, (error) => {
                console.error(`解码${soundName}音效失败:`, error);
            });
        } catch (error) {
            console.error(`使用Web Audio API播放${soundName}音效失败:`, error);
        }
    }
    
    // 使用Audio元素播放音效
    playSoundWithAudioElement(soundName) {
        try {
            // 创建新的音效实例，避免重叠播放问题
            const audio = new Audio(this.soundFiles[soundName]);
            audio.volume = 1.0;
            
            // 播放音效
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log(`${soundName}音效播放成功(Audio元素)`);
                }).catch(error => {
                    console.error(`播放${soundName}音效失败:`, error);
                    // 如果播放失败，尝试解锁音频
                    this.unlockAudio();
                });
            }
        } catch (error) {
            console.error(`使用Audio元素播放${soundName}音效失败:`, error);
        }
    }
    
    // 响应式调整画布尺寸
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // 计算最佳缩放比例
        const scaleX = containerWidth / this.baseWidth;
        const scaleY = containerHeight / this.baseHeight;
        this.scale = Math.min(scaleX, scaleY);
        
        // 设置画布大小
        this.canvas.width = this.baseWidth;
        this.canvas.height = this.baseHeight;
        
        // 设置画布样式尺寸（实际显示大小）
        this.canvas.style.width = `${this.baseWidth * this.scale}px`;
        this.canvas.style.height = `${this.baseHeight * this.scale}px`;
        
        // 更新虚拟按钮位置
        this.updateButtonPositions();
        
        // 重新定位画布
        const leftOffset = (containerWidth - this.baseWidth * this.scale) / 2;
        const topOffset = (containerHeight - this.baseHeight * this.scale) / 2;
        this.canvas.style.left = `${leftOffset}px`;
        this.canvas.style.top = `${topOffset}px`;
    }
    
    // 更新虚拟按钮位置
    updateButtonPositions() {
        this.virtualButtons = {
            pause: { 
                x: this.canvas.width - 160, 
                y: this.canvas.height - 80,
                radius: 40,
                text: '暂停' 
            },
            restart: { 
                x: this.canvas.width - 60,
                y: this.canvas.height - 80,
                radius: 40,
                text: '重启' 
            }
        };
    }
    
    // 转换触摸坐标到画布坐标
    convertTouchToCanvas(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) * (this.canvas.width / rect.width),
            y: (clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }
}

// 启动游戏
window.onload = () => {
    new Game();
}; 