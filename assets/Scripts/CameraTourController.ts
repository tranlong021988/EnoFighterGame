import { _decorator, Component, Node, Vec3, Quat, tween, director, clamp, easing, Tween } from 'cc';
const { ccclass, property } = _decorator;

/**
 * Controller cho Camera Tour: Tự động di chuyển, xoay và theo dõi liên tục các marker, 
 * kể cả các marker đang di chuyển, với tối ưu hóa đường xoay ngắn nhất.
 */
@ccclass('CameraTourController')
export class CameraTourController extends Component {

    @property({
        type: [Node],
        displayName: 'Camera Markers',
        tooltip: 'Danh sách các Node/Camera (điểm đánh dấu) cho đường đi.'
    })
    private cameraMarkers: Node[] = [];

    @property({
        range: [0.1, 10.0, 0.1],
        displayName: '1. Transition Time (s)',
        tooltip: 'Thời gian Camera cần để DI CHUYỂN giữa hai điểm đánh dấu (pha chuyển tiếp).'
    })
    private travelTime: number = 2.0;

    @property({
        range: [0.0, 60.0, 0.1],
        displayName: '2. Tracking Duration (s)',
        tooltip: 'Thời gian Camera sẽ KHÓA góc nhìn và theo dõi marker sau khi đến nơi. Đặt 0 để chỉ dùng Transition.'
    })
    private trackingDuration: number = 3.0; 

    @property({
        range: [0.01, 1.0, 0.01],
        displayName: '3. Tracking Smoothness',
        tooltip: 'Độ mượt khi theo dõi (0.1 rất chậm, 1.0 bám sát). Giá trị nhỏ hơn sẽ mượt hơn khi mục tiêu di chuyển nhanh.'
    })
    private trackingSmoothness: number = 0.15; 

    private currentTween: Tween<Node> | null = null;
    private isTourRunning: boolean = false;
    private currentMarkerIndex: number = 0;
    
    private trackingMarker: Node | null = null;
    private trackingTimer: number = 0;

    // --- Khởi tạo và Chu kỳ sống ---

    start() {
        if (this.cameraMarkers.length < 2) {
            console.warn("Cần ít nhất 2 Camera Marker để khởi tạo Camera Tour.");
            return;
        }

        // Đặt camera tổng ngay lập tức về vị trí của marker đầu tiên trước khi bắt đầu tour
        const startMarker = this.cameraMarkers[0];
        const { position, rotation } = this.getMarkerTransform(startMarker);
        this.node.setWorldPosition(position);
        this.node.setWorldRotation(rotation);

        this.startCameraTour();
    }

    onDestroy() {
        this.stopCameraTour();
    }
    
    /** * Xử lý việc theo dõi liên tục mục tiêu đang di chuyển trong pha Tracking.
     */
    update(dt: number) {
        if (this.trackingMarker) {
            this.followMovingTarget(dt);
        }
    }
    
    // --- Logic Xử lý Transform và Tracking ---

    /** Lấy tọa độ và góc xoay tuyệt đối (World Transform) của một Node */
    private getMarkerTransform(marker: Node): { position: Vec3, rotation: Quat } {
        const position = marker.worldPosition.clone();
        const rotation = marker.worldRotation.clone();
        return { position, rotation };
    }

    /** Xử lý việc theo dõi mục tiêu đang di chuyển bằng Lerp/Slerp */
    private followMovingTarget(dt: number) {
        if (!this.trackingMarker) return;

        // 1. Giảm bộ đếm thời gian
        this.trackingTimer -= dt;

        const { position: targetPos, rotation: targetRot } = this.getMarkerTransform(this.trackingMarker);

        // 2. Tính toán hệ số nội suy (lerpFactor)
        const lerpFactor = clamp(this.trackingSmoothness * 60 * dt, 0, 1);
        
        // 3. Nội suy vị trí và góc xoay
        Vec3.lerp(this.node.worldPosition, this.node.worldPosition, targetPos, lerpFactor);
        this.node.setWorldPosition(this.node.worldPosition);

        Quat.slerp(this.node.worldRotation, this.node.worldRotation, targetRot, lerpFactor);
        this.node.setWorldRotation(this.node.worldRotation);

        // 4. Kiểm tra kết thúc theo dõi
        if (this.trackingTimer <= 0) {
            this.trackingMarker = null;
            this.currentTween = null; 

            // Chuyển đến marker tiếp theo
            this.moveCameraToNextMarker(); 
        }
    }

    /** * Khởi động/Chuyển đến Marker tiếp theo (Pha Tween). 
     * Bao gồm logic tối ưu hóa đường xoay ngắn nhất.
     */
    private moveCameraToNextMarker() {
        if (!this.isTourRunning) return;
        if (this.trackingMarker) return;

        const totalMarkers = this.cameraMarkers.length;
        
        let nextMarkerIndex = (this.currentMarkerIndex + 1) % totalMarkers;
        const targetMarker = this.cameraMarkers[nextMarkerIndex];
        
        // 1. Lấy vị trí và góc xoay tuyệt đối
        const { position: targetPosition, rotation: targetRotation } = this.getMarkerTransform(targetMarker);
        
        // 2. TỐI ƯU HÓA ĐƯỜNG XOAY NGẮN NHẤT (Sử dụng Dot Product)
        // Lấy góc xoay hiện tại của camera tổng
        const startRotation = this.node.worldRotation;
        
        if (Quat.dot(startRotation, targetRotation) < 0) {
            // Đã sửa lỗi: Đảo dấu từng thành phần của Quaternion đích 
            // để Slerp chọn đường ngắn nhất.
            targetRotation.x *= -1;
            targetRotation.y *= -1;
            targetRotation.z *= -1;
            targetRotation.w *= -1;
        }
        
        // 3. Khởi tạo Tween (Transition Phase)
        this.currentTween = tween(this.node)
            .to(this.travelTime, 
                { 
                    worldPosition: targetPosition, 
                    worldRotation: targetRotation 
                }, 
                { 
                    easing: easing.sineInOut 
                }
            )
            // 4. Hành động sau khi Tween hoàn tất
            .call(() => {
                this.currentMarkerIndex = nextMarkerIndex;
                
                // Bắt đầu pha Theo dõi (Tracking)
                if (this.trackingDuration > 0) {
                    this.trackingMarker = targetMarker; 
                    this.trackingTimer = this.trackingDuration; 
                } else {
                    // Nếu không theo dõi, chuyển ngay đến marker tiếp theo
                    this.moveCameraToNextMarker(); 
                }
            })
            .start();
    }
    
    // --- Các hàm điều khiển Tour ---

    private startCameraTour() {
        if (this.isTourRunning) return;
        this.isTourRunning = true;
        this.currentMarkerIndex = 0;
        this.moveCameraToNextMarker();
    }

    public stopCameraTour() {
        if (!this.isTourRunning) return;
        this.isTourRunning = false;
        if (this.currentTween) {
            this.currentTween.stop();
            this.currentTween = null;
        }
    }
}