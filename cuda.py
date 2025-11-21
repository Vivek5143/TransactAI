import torch
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA version: {torch.version.cuda}")
print(f"GPU: {torch.cuda.get_device_name(0)}")
print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")

# Test GPU speed
if torch.cuda.is_available():
    x = torch.randn(10000, 10000).cuda()
    y = torch.randn(10000, 10000).cuda()
    z = x @ y  # Matrix multiplication
    print("✅ GPU test passed - Tensor operations working!")