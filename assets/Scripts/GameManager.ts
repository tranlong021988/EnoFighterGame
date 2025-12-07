import { _decorator, Color, Component, director, Director, game, Node, randomRange, RichText, tween, UITransform} from 'cc';
import { Fighter } from './Fighter'; 
import {TimeScale} from './TimeScaleManager';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    
    @property(Node)
    public HealthBarA:UITransform;
    @property(Node)
    public HealthBarB:UITransform;
    @property(RichText)
    public PowerRankA:RichText;
    @property(RichText)
    public PowerRankB:RichText;
    @property(RichText)
    public MatchNum:RichText;

    @property({ 
        type: Fighter, 
        displayName: 'Fighter A' 
    })
    public fighterA: Fighter = null!;

    @property({ 
        type: Fighter, 
        displayName: 'Fighter B' 
    })
    public fighterB: Fighter = null!;

    ///
    private HealthBarBaseLength:number = -1;

    @property(Number)
    public MinFightTick:number = 0.5;
    @property(Number)
    public MaxFightTick:number = 1.0;
    
    private FightTick:number = 1.0;

    // Biến mới: Lưu trữ số thứ tự trận đấu hiện tại
    private currentMatchId: number = 0; 

    // --- CÁC THÔNG SỐ CƠ SỞ (BASE STATS) ---
    private readonly T_MAX: number = 100; // Số trận đấu tối đa (dùng để tính toán)
    private readonly BASE_STATS_A = {
        strikeRate: 85, criticalRate: 30, basicDamage: 80, criticalDamage: 170, evasionRate: 50, flatDefense: 40
    };
    private readonly BASE_STATS_B = {
        strikeRate: 85, criticalRate: 30, basicDamage: 80, criticalDamage: 170, evasionRate: 50, flatDefense: 40
    };
    private readonly BASE_HEALTH: number = 1000;
    private readonly MAX_HEALTH_INCREMENT: number = 1000; 

    
    // --- KHỞI ĐỘNG VÀ QUẢN LÝ TRẬN ĐẤU ---

    start() {
        if (!this.fighterA || !this.fighterB) {
           
            console.error("GameManager: Phải gán cả Fighter A và Fighter B!");
            return;
        }
            this.fighterA.competitor = this.fighterB;
            this.fighterB.competitor = this.fighterA;
            this.fighterA.gameManager = this;
            this.fighterB.gameManager = this;
        // Thiết lập thông số cho TRẬN ĐẤU ĐẦU TIÊN
        TimeScale.init();
       // TimeScale.setScale(0.2);
        this.setupNextMatchStats();
        this.startNewFight();
    }
    private setupGameUI(){
        if(this.HealthBarBaseLength==-1){
            this.HealthBarBaseLength = this.HealthBarA.width;
        }
        this.MatchNum.string = '<color=white>'+this.currentMatchId+'</color>';
        this.PowerRankA.string =  '<color=white>PowerRank :</color><color=red>'+this.fighterA.getFinalCombatRating()+'</color>';
        this.PowerRankB.string =  '<color=white>PowerRank :</color><color=red>'+this.fighterB.getFinalCombatRating()+'</color>';
    }
    private updateGameUI(){
        let widthA = this.fighterA.currentHealth/this.fighterA.maxHealth * this.HealthBarBaseLength;
        tween(this.HealthBarA).to(0.1,{width:widthA}).start();
        let widthB= this.fighterB.currentHealth/this.fighterB.maxHealth * this.HealthBarBaseLength;
        tween(this.HealthBarB).to(0.1,{width:widthB}).start();
    }
    
    private startNewFight() {
        console.log(`\n================================`);
        console.log(`--- BẮT ĐẦU TRẬN ĐẤU #${this.currentMatchId} ---`);
        console.log(`Fighter A (Máu: ${this.fighterA.maxHealth}): CR ${this.fighterA.getFinalCombatRating().toFixed(0)}`);
        console.log(`Fighter B (Máu: ${this.fighterB.maxHealth}): CR ${this.fighterB.getFinalCombatRating().toFixed(0)}`);
        console.log(`================================`);
        this.setupGameUI();
        this.updateGameUI();

        // Thiết lập chạy hàm Fight mỗi 0.5 giây
        this.FightTick = randomRange(this.MinFightTick,this.MaxFightTick);
        this.schedule(this.Fight, this.FightTick); 
        
       //this.Fight();
    }
    
    


    /**
     * Phương thức Cốt lõi: Mô phỏng 1 lượt đánh.
     */

    public Fight() {
       // 
       
        if (!this.fighterA.isAlive() || !this.fighterB.isAlive()) {
            this.unschedule(this.Fight);
            console.log(`\n--- KẾT THÚC TRẬN ĐẤU #${this.currentMatchId} ---`);
            const winner = this.fighterA.isAlive() ? this.fighterA.node.name : this.fighterB.node.name;
            console.log(`Người chiến thắng là: ${winner}!`);
            
            // Tự động setup trận tiếp theo nếu chưa đạt giới hạn
            if (this.currentMatchId < this.T_MAX) {
                this.setupNextMatchStats();
                this.startNewFight();
                
            } else {
                console.log(`Đã hoàn thành ${this.T_MAX} trận đấu!`);
            }
            return;
        }
        
        // ... (GIỮ NGUYÊN LOGIC PHASE CỦA BẠN: GIÀNH LƯỢT, TÍNH SÁT THƯƠNG, ÁP DỤNG PHÒNG THỦ) ...

        // 1. PHASE: GIÀNH LƯỢT ĐÁNH (Turn Priority)
        const totalStrikeRate = this.fighterA.strikeRate + this.fighterB.strikeRate;
        const rollPriority = Math.random() * totalStrikeRate; 
        
        let attacker: Fighter;
        let defender: Fighter;
        

        if (rollPriority < this.fighterA.strikeRate) {
            attacker = this.fighterA;
            defender = this.fighterB;
        } else {
            attacker = this.fighterB;
            defender = this.fighterA;
        }
       // attacker.competitor = defender;
       // defender.competitor = attacker;
        ///////////////////////////////////////////// setup Animation 
        attacker.doAttack();
        console.log("fight!");

        // console.log(`\n--- LƯỢT MỚI: ${attacker.node.name} giành quyền ra đòn! ---`); // Bỏ console.log này để tránh quá nhiều thông báo

        // 2. PHASE: TÍNH SÁT THƯƠNG THÔ (Raw Damage)
        const rollCrit = Math.random() * 100; // Roll từ 0 đến 100
        let isCritical = rollCrit < attacker.criticalRate;
        let rawDamage: number;
        let hitType: string;
        
        if (isCritical) {
            rawDamage = attacker.criticalDamage;
            hitType = 'CRITICAL HIT (Chí mạng)';
        } else {
            rawDamage = attacker.basicDamage;
            hitType = 'BASIC HIT (Cơ bản)';
        }
        
        // console.log(`[${attacker.node.name}]: Đòn đánh là ${hitType}. Sát thương Thô: ${rawDamage.toFixed(2)}.`);

        // 3. PHASE: ÁP DỤNG PHÒNG THỦ ĐỘNG & TÍNH SÁT THƯƠNG CUỐI CÙNG (Final Damage)
        let finalDamage = rawDamage;

        // 3A. Quyết định Né đòn (Evasion Roll)
        const rollEvasion = Math.random() * 100; // Roll từ 0 đến 100
        
        if (rollEvasion < defender.evasionRate) {
            finalDamage = 0;
            defender.flashDamageEffect(new Color(0, 255, 0, 255)); 
            defender.doDefense();
            console.log(`[LƯỢT #${this.currentMatchId}]: ${attacker.node.name} ATTACK => ${defender.node.name} **NÉ ĐÒN** (Eva: ${defender.evasionRate.toFixed(1)}%). Máu còn: ${defender.currentHealth.toFixed(0)}`);
        } else {
            // 3B. Áp dụng Giảm Sát thương Tuyệt đối (Flat Damage Reduction)
            const flatDefense = defender.flatDefense;
            finalDamage = rawDamage - flatDefense;
            
            // 3C. Giới hạn Sát thương Tối thiểu
            finalDamage = Math.max(0, finalDamage);
            
            defender.takeDamage(finalDamage);
            defender.doDamage();
            console.log(`[LƯỢT #${this.currentMatchId}]: ${attacker.node.name} Tấn công (${hitType} Dmg: ${rawDamage.toFixed(0)} - Def: ${flatDefense.toFixed(0)}) => ${defender.node.name} Nhận **${finalDamage.toFixed(0)}** Sát thương. Máu còn: ${defender.currentHealth.toFixed(0)}`);
        }
        ////
        this.updateGameUI();
        
        this.unschedule(this.Fight);
        this.FightTick = randomRange(this.MinFightTick,this.MaxFightTick);
        this.schedule(this.Fight, this.FightTick); 
    }

    // --- PHƯƠNG THỨC SETUP CHỈ SỐ KỊCH TÍNH TĂNG DẦN ---

    /**
     * Thiết lập chỉ số chiến đấu cho đấu sĩ A và B dựa trên số thứ tự trận đấu (tăng dần độ khó/kịch tính).
     */
    public setupNextMatchStats(): void {
        this.currentMatchId++;
        const T = this.currentMatchId;
        const T_Max = this.T_MAX;

        // 1. TÍNH HỆ SỐ ĐIỀU CHỈNH
        // Hệ số cân bằng Strike Rate (alpha) và Tăng ngẫu nhiên (randomIncrease)
        const alpha = 0.7 * (T - 1) / (T_Max - 1); 
        const randomIncreaseFactor = 0.05 * (T - 1) / (T_Max - 1); // Tăng 5% cơ sở khi đạt T_Max
        
        // Tăng máu tuyến tính (từ 1000 -> 2000)
        const healthIncrease = this.MAX_HEALTH_INCREMENT * (T - 1) / (T_Max - 1);
        const newMaxHealth = this.BASE_HEALTH + healthIncrease;

        // 2. TÍNH TOÁN VÀ ÁP DỤNG STATS CHO A
        this.applyBalancedStats(this.fighterA, this.BASE_STATS_A, this.BASE_STATS_B, alpha, randomIncreaseFactor, newMaxHealth);

        // 3. TÍNH TOÁN VÀ ÁP DỤNG STATS CHO B
        // Lưu ý: Đối với B, BASE_STATS_A là opponentBaseStats
        this.applyBalancedStats(this.fighterB, this.BASE_STATS_B, this.BASE_STATS_A, alpha, randomIncreaseFactor, newMaxHealth);
        
        // 4. Reset máu và in ra chỉ số cân bằng (cho debug/theo dõi)
        this.fighterA.currentHealth = this.fighterA.maxHealth;
        this.fighterB.currentHealth = this.fighterB.maxHealth;

        // console.log(`Trận ${T}: A Strike: ${this.fighterA.strikeRate.toFixed(2)} | B Strike: ${this.fighterB.strikeRate.toFixed(2)} | Health: ${newMaxHealth.toFixed(0)}`);
    }

    /**
     * Hàm nội bộ để áp dụng các chỉ số đã được cân bằng cho một đấu sĩ cụ thể.
     */
    private applyBalancedStats(
        fighter: Fighter, 
        baseStats: typeof this.BASE_STATS_A, 
        opponentBaseStats: typeof this.BASE_STATS_A, 
        alpha: number, 
        randomIncreaseFactor: number, 
        newMaxHealth: number
    ): void {
        const avgStrikeRate = (baseStats.strikeRate + opponentBaseStats.strikeRate) / 2;

        // CÂN BẰNG STRIKE RATE: Kéo về giá trị trung bình
        const balancedStrikeRate = baseStats.strikeRate * (1 - alpha) + avgStrikeRate * alpha;
        fighter.strikeRate = parseFloat(balancedStrikeRate.toFixed(2));

        // TĂNG YẾU TỐ NGẪU NHIÊN: Crit Rate và Evasion Rate
        fighter.criticalRate = parseFloat((baseStats.criticalRate + randomIncreaseFactor * 100).toFixed(2));
        fighter.evasionRate = parseFloat((baseStats.evasionRate + randomIncreaseFactor * 100).toFixed(2));
        
        // CÁC CHỈ SỐ KHÁC
        fighter.basicDamage = baseStats.basicDamage;
        fighter.criticalDamage = baseStats.criticalDamage;
        fighter.flatDefense = baseStats.flatDefense;

        // CẬP NHẬT MÁU
        fighter.maxHealth = parseFloat(newMaxHealth.toFixed(0));
    }
}