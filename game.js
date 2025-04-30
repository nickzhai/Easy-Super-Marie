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
        
        // 音频系统
        this.audioEnabled = false;
        this.jumpSound = new Audio();
        this.collisionSound = new Audio();
        
        // 设置音频源
        this.jumpSound.src = 'jump.mp3';
        this.collisionSound.src = 'collision.mp3';
        
        // 预加载音效
        this.jumpSound.preload = 'auto';
        this.collisionSound.preload = 'auto';
        
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
        this.gameStarted = true;
        
        // 触摸状态
        this.touchActive = false;
        
        // 响应式缩放
        this.resizeGame();
        window.addEventListener('resize', () => this.resizeGame());
        
        this.setupEventListeners();
        
        // 添加音频解锁逻辑
        this.unlockAudio();
        
        // 直接开始游戏
        this.startGame();
    }
    
    // 解锁音频的方法
    unlockAudio() {
        const unlockAudio = () => {
            // 尝试播放一个静音的音频
            const audio = new Audio();
            audio.volume = 0;
            audio.play().then(() => {
                this.audioEnabled = true;
                console.log("音频已解锁");
            }).catch(error => {
                console.error("音频解锁失败:", error);
            });
            
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
        });
        
        // 触摸事件
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const pos = this.convertTouchToCanvas(touch.clientX, touch.clientY);
            
            // 如果游戏状态正常，则触发跳跃
            if (!this.player.jumping && !this.isPaused && !this.isGameOver) {
                this.player.jumping = true;
                this.player.velocity = this.jumpForce;
                this.playJumpSound();
            }
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touchActive = false;
        });
        
        // 虚拟按钮事件
        document.getElementById('pauseButton').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('restartButton').addEventListener('click', () => {
            this.reset();
        });
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
        if (this.isPaused) return;
        
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
                this.gameOverState.obstacles.forEach(obstacle => {
                    this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                });
            }
            
            // 显示游戏结束文字
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#333';
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`游戏结束！得分：${this.score}`, this.canvas.width / 2, this.canvas.height / 2);
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
            
            // 如果游戏暂停，显示暂停文字
            if (this.isPaused) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.fillStyle = '#333';
                this.ctx.font = '30px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('游戏暂停', this.canvas.width / 2, this.canvas.height / 2);
            }
        }
    }
    
    gameOver() {
        this.isGameOver = true;
        
        // 确保游戏结束时障碍物仍然可见
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
        document.getElementById('pauseButton').textContent = '⏸';
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    // 播放跳跃音效
    playJumpSound() {
        if (!this.audioEnabled) return;
        
        try {
            const sound = new Audio('jump.mp3');
            sound.volume = 1.0;
            const playPromise = sound.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("播放跳跃音效失败:", error);
                });
            }
        } catch (error) {
            console.error("播放跳跃音效出错:", error);
        }
    }
    
    // 播放碰撞音效
    playCollisionSound() {
        if (!this.audioEnabled) return;
        
        try {
            const sound = new Audio('collision.mp3');
            sound.volume = 1.0;
            const playPromise = sound.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("播放碰撞音效失败:", error);
                });
            }
        } catch (error) {
            console.error("播放碰撞音效出错:", error);
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
        
        // 重新定位画布
        const leftOffset = (containerWidth - this.baseWidth * this.scale) / 2;
        const topOffset = (containerHeight - this.baseHeight * this.scale) / 2;
        this.canvas.style.left = `${leftOffset}px`;
        this.canvas.style.top = `${topOffset}px`;
    }
    
    // 转换触摸坐标到画布坐标
    convertTouchToCanvas(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) * (this.canvas.width / rect.width),
            y: (clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pauseButton').textContent = this.isPaused ? '▶' : '⏸';
    }
}

// 启动游戏
window.onload = () => {
    new Game();
}; 