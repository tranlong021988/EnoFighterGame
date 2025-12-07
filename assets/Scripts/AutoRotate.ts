import { _decorator, Component, Vec3, Quat, Node } from 'cc';
const { ccclass, property } = _decorator;

/**
 * Enum để chọn không gian xoay: Local (tại chỗ) hoặc World (toàn cục).
 */
enum RotationSpace {
    LOCAL = 0,
    WORLD = 1,
}

@ccclass('AutoRotate')
export class AutoRotate extends Component {

    @property({
        type: Vec3,
        tooltip: 'Tốc độ xoay theo trục X, Y, Z (độ/giây).'
    })
    public rotationSpeed: Vec3 = new Vec3(0, 50, 0); // Mặc định xoay 50 độ/giây quanh trục Y

    @property({
        type: RotationSpace,
        displayName: 'Rotation Space',
        tooltip: 'Chọn không gian áp dụng phép xoay: Local (xoay trên chính trục của Node) hoặc World (xoay quanh trục thế giới).'
    })
    public space: RotationSpace = RotationSpace.LOCAL;

    // Quaternion dùng để tính toán phép xoay
    private rotationDelta: Quat = new Quat();
    // Vector 3 tạm thời để lưu giá trị xoay (Euler angle)
    private tempRotation: Vec3 = new Vec3(); 

    /**
     * Hàm được gọi mỗi khung hình để áp dụng phép xoay.
     * @param dt Thời gian trôi qua kể từ khung hình cuối cùng (Delta Time).
     */
    update(dt: number) {
        // 1. Tính toán góc xoay theo thời gian (độ/giây * dt)
        Vec3.multiplyScalar(this.tempRotation, this.rotationSpeed, dt);

        // 2. Chuyển đổi góc Euler sang Quaternion (quaternion delta)
        // Note: Dùng fromEuler để tạo phép quay từ góc (X, Y, Z)
        Quat.fromEuler(this.rotationDelta, this.tempRotation.x, this.tempRotation.y, this.tempRotation.z);

        // 3. Áp dụng phép xoay
        if (this.space === RotationSpace.LOCAL) {
            // A. LOCAL SPACE: Áp dụng phép xoay lên phép quay hiện tại của Node.
            // Node.rotate(delta) là cách chuẩn và dễ đọc nhất cho Local space.
            this.node.rotate(this.rotationDelta); 
            
            // Thay thế bằng cách gọi thủ công:
            // Quat.multiply(this.node.rotation, this.node.rotation, this.rotationDelta);
            // this.node.setRotation(this.node.rotation);

        } else if (this.space === RotationSpace.WORLD) {
            // B. WORLD SPACE: Xoay quanh các trục World (thế giới)
            // Phương thức rotate(delta, space) của Node cho phép chọn World Space.
            this.node.rotate(this.rotationDelta, Node.TransformBit.WORLD);

            // Thay thế bằng cách gọi thủ công:
            // Node.TransformBit.WORLD đảm bảo phép nhân Quaternion được áp dụng từ bên trái (World).
            // Quat.multiply(this.node.rotation, this.rotationDelta, this.node.rotation);
            // this.node.setRotation(this.node.rotation);
        }
    }
}