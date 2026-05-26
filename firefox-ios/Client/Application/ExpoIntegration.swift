// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

//
//  Firefox iOS + Expo Brownfield demo
//
//  Bootstraps the embedded React Native runtime, seeds shared state with
//  a mock bookmarks snapshot, and listens for messages from the
//  Bookmarks Inspector RN screen.
//

#if os(iOS)
    import Foundation
    import UIKit
    import FirefoxExpo

    @objc public final class ExpoIntegration: NSObject {
        /// Call from AppDelegate.didFinishLaunchingWithOptions. Initializes
        /// the React Native host, seeds shared state, and subscribes to
        /// messages from RN.
        @objc public static func bootstrap() {
            ReactNativeHostManager.shared.initialize()
            seedSharedState()
            registerMessageHandlers()
        }

        /// Returns a navigation controller hosting the Bookmarks Inspector
        /// RN screen, ready to be presented from any UIViewController.
        @objc public static func makeInspectorViewController() -> UIViewController {
            let rn = ReactNativeViewController(moduleName: "main")
            rn.title = "Bookmarks"
            let nav = UINavigationController(rootViewController: rn)
            nav.modalPresentationStyle = .fullScreen
            let done = UIBarButtonItem(
                barButtonSystemItem: .done,
                target: nav,
                action: #selector(UIViewController.dismissExpoInspector)
            )
            rn.navigationItem.rightBarButtonItem = done
            return nav
        }

        /// Demo helper: when launched with `-FirefoxExpoAutoPresent YES`,
        /// present the Bookmarks Inspector as a full-screen modal so the
        /// integration is recordable without UI automation. Presenting (vs.
        /// taking over the rootVC) keeps Firefox's own UI intact and makes
        /// the Done button work naturally.
        @objc public static func scheduleAutoPresentIfRequested() {
            guard UserDefaults.standard.bool(forKey: "FirefoxExpoAutoPresent") else { return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                presentOnKeyWindow()
                if UserDefaults.standard.bool(forKey: "FirefoxExpoAutoDemo") {
                    scheduleDemoActions()
                }
            }
        }

        /// Self-driving demo sequence: fires a Sync round, then visits two
        /// bookmarks at staggered intervals so the recording shows
        /// bidirectional state + messaging without external UI automation.
        private static func scheduleDemoActions() {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { syncNow() }
            DispatchQueue.main.asyncAfter(deadline: .now() + 5.5) {
                openBookmark(["id": 1])
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 8.0) {
                openBookmark(["id": 3])
            }
        }

        private static func presentOnKeyWindow() {
            guard let scene = UIApplication.shared.connectedScenes
                    .compactMap({ $0 as? UIWindowScene }).first,
                  let window = scene.windows.first(where: { $0.isKeyWindow }) ?? scene.windows.first,
                  let root = window.rootViewController
            else { return }
            var presenter = root
            while let next = presenter.presentedViewController { presenter = next }
            if presenter !== root {
                presenter.dismiss(animated: false) {
                    root.present(makeInspectorViewController(), animated: true)
                }
            } else {
                root.present(makeInspectorViewController(), animated: true)
            }
        }

        private static func seedSharedState() {
            let now = ISO8601DateFormatter().string(from: Date())
            BrownfieldState.set("historyCount", 1432)
            BrownfieldState.set("openTabCount", 7)
            BrownfieldState.set("syncStatus", "Idle")
            BrownfieldState.set("lastSyncedAt", now)
            BrownfieldState.set("bookmarks", sampleBookmarks())
        }

        private static func sampleBookmarks() -> [[String: Any]] {
            [
                [
                    "id": 1,
                    "title": "Firefox — Protect your life online with privacy-first products",
                    "url": "https://www.mozilla.org/firefox/",
                    "domain": "mozilla.org",
                    "visited": false,
                ],
                [
                    "id": 2,
                    "title": "MDN Web Docs",
                    "url": "https://developer.mozilla.org",
                    "domain": "developer.mozilla.org",
                    "visited": false,
                ],
                [
                    "id": 3,
                    "title": "expo/expo: An open-source platform for making universal native apps",
                    "url": "https://github.com/expo/expo",
                    "domain": "github.com",
                    "visited": false,
                ],
                [
                    "id": 4,
                    "title": "Hacker News",
                    "url": "https://news.ycombinator.com",
                    "domain": "news.ycombinator.com",
                    "visited": true,
                ],
                [
                    "id": 5,
                    "title": "Wikipedia, the free encyclopedia",
                    "url": "https://en.wikipedia.org",
                    "domain": "wikipedia.org",
                    "visited": false,
                ],
            ]
        }

        private static func registerMessageHandlers() {
            _ = BrownfieldMessaging.addListener { message in
                guard let type = message["type"] as? String else { return }
                switch type {
                case "OPEN_BOOKMARK":
                    openBookmark(message)
                case "SYNC_NOW":
                    syncNow()
                default:
                    break
                }
            }
        }

        private static func openBookmark(_ message: [String: Any]) {
            guard let id = message["id"] as? Int else { return }
            guard var bookmarks = BrownfieldState.get("bookmarks") as? [[String: Any]] else { return }
            guard let idx = bookmarks.firstIndex(where: { ($0["id"] as? Int) == id }) else { return }
            bookmarks[idx]["visited"] = true
            BrownfieldState.set("bookmarks", bookmarks)
            BrownfieldState.set(
                "historyCount",
                ((BrownfieldState.get("historyCount") as? Int) ?? 0) + 1
            )
            BrownfieldState.set(
                "openTabCount",
                ((BrownfieldState.get("openTabCount") as? Int) ?? 0) + 1
            )
            BrownfieldMessaging.sendMessage([
                "type": "BOOKMARK_OPENED",
                "id": id,
                "title": bookmarks[idx]["title"] as? String ?? "",
            ])
        }

        private static func syncNow() {
            BrownfieldState.set("syncStatus", "Syncing…")
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) {
                BrownfieldState.set("syncStatus", "Idle")
                BrownfieldState.set("lastSyncedAt", ISO8601DateFormatter().string(from: Date()))
                BrownfieldMessaging.sendMessage(["type": "SYNC_FINISHED"])
            }
        }
    }

    private extension UIViewController {
        @objc func dismissExpoInspector() {
            self.dismiss(animated: true)
        }
    }
#endif
