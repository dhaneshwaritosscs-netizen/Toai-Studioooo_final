# Label Studio - User System Requirements

This document outlines the system requirements that users need to properly use Label Studio. The project is already hosted, so users don't need to install anything.

## Operating System Requirements

### Supported Operating Systems
- **Windows**: Windows 10 (version 1903) or later, Windows 11
- **macOS**: macOS 10.15 (Catalina) or later
- **Linux**: Ubuntu 18.04+, CentOS 7+, Debian 9+, or equivalent distributions

### Tested Configuration
- **OS**: Windows 11 Home Single Language
- **Architecture**: 64-bit operating system, x64-based processor

## Hardware Requirements

### Recommended Requirements (Smooth Experience)
- **CPU**: Intel Core i5 or AMD Ryzen 5 (2.4 GHz or higher)
- **RAM**: 8 GB or more
- **Storage**: 10 GB free disk space (SSD recommended)
- **Graphics**: Dedicated GPU with 1GB+ VRAM (for large images/videos)

### Optimal Requirements (Heavy Usage)
- **CPU**: Intel Core i7 or AMD Ryzen 7 (2.4 GHz or higher)
- **RAM**: 16 GB or more
- **Storage**: 20 GB free disk space (SSD recommended)
- **Graphics**: Dedicated GPU with 2GB+ VRAM

### Tested Hardware Configuration
- **CPU**: 13th Gen Intel(R) Core(TM) i7-13620H (2.40 GHz)
- **RAM**: 16.0 GB (15.6 GB usable) @ 5200 MT/s
- **Graphics**: Intel(R) UHD Graphics
- **Storage**: 954 GB total (420 GB used)

## Browser Requirements

### Supported Browsers
- **Chrome**: Version 90+ (recommended)
- **Firefox**: Version 88+
- **Safari**: Version 14+
- **Edge**: Version 90+
- **Opera**: Version 76+

### Browser Features Required
- **JavaScript**: Must be enabled
- **Cookies**: Must be enabled
- **Local Storage**: Must be enabled
- **WebGL**: Required for 3D annotations
- **WebRTC**: Required for video annotations
- **Canvas API**: Required for image annotations

### Browser Extensions
- **Ad Blockers**: May interfere with functionality (disable for Label Studio)
- **Privacy Extensions**: May block required features
- **VPN**: May affect performance (use stable connection)

## Network Requirements

### Internet Connection
- **Minimum Speed**: 5 Mbps download, 1 Mbps upload
- **Recommended Speed**: 25 Mbps download, 5 Mbps upload
- **Stable Connection**: Required for real-time collaboration
- **Low Latency**: <100ms ping for smooth experience

### Network Configuration
- **Ports**: No specific ports required (uses standard HTTP/HTTPS)
- **Firewall**: Allow web traffic (ports 80, 443)
- **Proxy**: Supported but may affect performance
- **Corporate Networks**: May require IT approval for access

## Display Requirements

### Screen Resolution
- **Minimum**: 1024x768 pixels
- **Recommended**: 1920x1080 pixels or higher
- **Optimal**: 2560x1440 pixels or higher (for large datasets)

### Display Features
- **Color Depth**: 24-bit color minimum
- **Refresh Rate**: 60Hz minimum
- **Multiple Monitors**: Supported (better for large projects)
- **Touch Screen**: Supported (for touch annotations)

## Input Devices

### Required
- **Mouse**: Standard 2-button mouse with scroll wheel
- **Keyboard**: Standard QWERTY keyboard

### Optional (Enhanced Experience)
- **Graphics Tablet**: For precise annotations
- **Stylus**: For touch screen annotations
- **Multi-touch Trackpad**: For gesture support

## Performance Considerations

### Memory Usage
- **Basic Usage**: 2-4 GB RAM
- **Medium Projects**: 4-8 GB RAM
- **Large Projects**: 8-16 GB RAM
- **Very Large Projects**: 16+ GB RAM

### Storage Requirements
- **Browser Cache**: 1-2 GB (for cached data)
- **Downloads**: Variable (depends on export size)
- **Temporary Files**: 500 MB - 2 GB

### CPU Usage
- **Idle**: Minimal CPU usage
- **Basic Annotation**: Low CPU usage
- **Image Processing**: Moderate CPU usage
- **Video Processing**: High CPU usage
- **Real-time Collaboration**: Moderate CPU usage

## Accessibility Requirements

### Visual Accessibility
- **Screen Reader**: Compatible with NVDA, JAWS, VoiceOver
- **High Contrast**: Supported
- **Zoom**: Browser zoom up to 200% supported
- **Color Blindness**: Color alternatives provided

### Motor Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Voice Control**: Compatible with voice control software
- **Switch Control**: Supported on compatible devices

## Security Requirements

### Browser Security
- **HTTPS**: Always use HTTPS connection
- **Updated Browser**: Keep browser updated
- **Security Extensions**: Compatible with security extensions
- **Private Mode**: Supported but may limit functionality

### Data Security
- **Local Storage**: Data stored securely in browser
- **Session Management**: Automatic logout after inactivity
- **Data Encryption**: All data encrypted in transit

## Troubleshooting

### Common Issues
1. **Slow Performance**: Close other browser tabs, restart browser
2. **Display Issues**: Check browser zoom level, clear cache
3. **Upload Problems**: Check internet connection, file size limits
4. **Annotation Issues**: Ensure JavaScript is enabled
5. **Login Problems**: Clear browser cookies and cache

### Browser-Specific Solutions
- **Chrome**: Clear browsing data, disable extensions temporarily
- **Firefox**: Refresh Firefox, check about:config settings
- **Safari**: Clear website data, disable content blockers
- **Edge**: Clear browsing data, disable tracking prevention

### Performance Optimization
- **Close Unnecessary Tabs**: Free up memory
- **Restart Browser**: Clear memory leaks
- **Update Browser**: Get latest performance improvements
- **Check Internet Speed**: Use speed test tools

## Support Information

### Getting Help
- **Documentation**: Check online help center
- **Community**: Join user community forums
- **Support**: Contact technical support if needed

### System Check
- **Browser Test**: Use browser compatibility checker
- **Speed Test**: Check internet connection speed
- **System Info**: Verify system meets requirements

---

**Last Updated**: Current date
**Tested Environment**: Windows 11, Intel i7-13620H, 16GB RAM
